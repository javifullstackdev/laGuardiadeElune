"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Tipos ──────────────────────────────────────────────────────────────────

type TitleData = {
  id: string;
  name: string;
  source: string;
  description?: string | null;
};

type User = {
  username: string;
  guild_title: string;
  total_points: number;
  avatar_url: string | null;
  role: string;
  path: string;
  blizzard_battletag: string | null;
  has_blizzard: boolean;
  birthday: string | null;
};

type Character = {
  name: string;
  surname: string | null;
  prefix_title: string | null;
  game: string;
  realm: string;
  blizzard_character_id: number | null;
  avatar_url: string | null;
  custom_avatar_url: string | null;
  pending_avatar_url: string | null;
  wow_class: string | null;
  race: string | null;
  faction: string | null;
  role_function: string | null;
  level: number | null;
  is_main: boolean;
  is_alt: boolean;
  is_verified: boolean;
  favorite_title: TitleData | null;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
  origin: string | null;
  age_lore: number | null;
  residence: string | null;
};

type Transaction = {
  amount: number;
  reason: string;
  event_category: string | null;
  created_at: string;
};

type RelationData = {
  id: string;
  relation_type: string;
  description: string | null;
  direction: "outgoing" | "incoming";
  other: { name: string; realm: string; wow_class: string | null; owner_username: string };
};

// ── Lookups ───────────────────────────────────────────────────────────────

const CLASS_COLOR: Record<string, string> = {
  WARRIOR: "#C79C6E", PALADIN: "#F58CBA", HUNTER: "#ABD473",
  ROGUE: "#FFF569", PRIEST: "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN: "#0070DE", MAGE: "#69CCF0", WARLOCK: "#9482C9",
  MONK: "#00FF96", DRUID: "#FF7D0A", DEMONHUNTER: "#A330C9", EVOKER: "#33937F",
};

const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador",
  ROGUE: "Pícaro", PRIEST: "Sacerdote", DEATH_KNIGHT: "Caballero de la Muerte",
  SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo",
  MONK: "Monje", DRUID: "Druida", DEMONHUNTER: "Cazador de Demonios", EVOKER: "Evocador",
};

const RACE_NAME_ES: Record<string, string> = {
  HUMAN: "Humano", ORC: "Orco", DWARF: "Enano", NIGHT_ELF: "Elfo de la noche",
  UNDEAD: "No-muerto", TAUREN: "Tauren", GNOME: "Gnomo", TROLL: "Troll",
  BLOOD_ELF: "Elfo de sangre", DRAENEI: "Draenei", WORGEN: "Huargen",
  PANDAREN: "Pandaren", NIGHTBORNE: "Nacido de la noche",
  HIGHMOUNTAIN_TAUREN: "Tauren de la Cima", VOID_ELF: "Elfo del vacío",
  LIGHTFORGED: "Forjado a la Luz", DARK_IRON_DWARF: "Enano Hierro Negro",
  KUL_TIRAN: "Kul Tirano", MECHAGNOME: "Mecagnomo", ZANDALARI: "Trol zandalari",
  GOBLIN: "Goblin", VULPERA: "Vulpera", MAGHAR_ORC: "Orco Mag'har", DRACTHYR: "Dracthyr",
};

const FACTION_ES: Record<string, string> = {
  ALLIANCE: "Alianza", HORDE: "Horda", NEUTRAL: "Neutral",
};

const FACTION_COLOR: Record<string, string> = {
  ALLIANCE: "#6699FF", HORDE: "#CC3300",
};

const ROLE_LABEL: Record<string, string> = {
  TANK: "Tank", HEALER: "Healer",
  DPS_MELEE: "DPS Melé", DPS_RANGED: "DPS a distancia",
};

export const RELATION_TYPES: { value: string; label: string }[] = [
  { value: "ally",       label: "Aliado/a" },
  { value: "rival",      label: "Rival" },
  { value: "family",     label: "Familiar" },
  { value: "mentor",     label: "Mentor" },
  { value: "apprentice", label: "Aprendiz" },
  { value: "friend",     label: "Amigo/a" },
  { value: "enemy",      label: "Enemigo/a" },
  { value: "romantic",   label: "Interés romántico" },
  { value: "companion",  label: "Compañero/a de aventuras" },
];

function getRelationLabel(type: string) {
  return RELATION_TYPES.find((r) => r.value === type)?.label ?? type;
}

// ── Tipo de edición parcial de personaje ──────────────────────────────────

type CharPatch = Partial<Pick<Character,
  "surname" | "prefix_title" | "biography" | "personality" | "appearance" |
  "origin" | "age_lore" | "residence" |
  "avatar_url" | "custom_avatar_url" | "pending_avatar_url"
>>;

// ── Componente principal ───────────────────────────────────────────────────

export default function ProfileClient({
  user,
  characters: initialChars,
  transactions,
}: {
  user: User;
  characters: Character[];
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [characters, setCharacters] = useState<Character[]>(initialChars);
  const [selected, setSelected] = useState<Character | null>(initialChars[0] ?? null);

  function handleSelect(char: Character) {
    // Sincronizar con la versión más actualizada del estado local
    const fresh = characters.find((c) => c.name === char.name && c.realm === char.realm) ?? char;
    setSelected(fresh);
  }

  async function handleSetMain(char: Character) {
    if (char.is_main) return;
    const updated = characters.map((c) => ({
      ...c,
      is_main: c.name === char.name && c.realm === char.realm,
      is_alt:  !(c.name === char.name && c.realm === char.realm),
    }));
    updated.sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
    setCharacters(updated);
    setSelected({ ...char, is_main: true });
    startTransition(async () => {
      const res = await fetch("/api/characters/set-main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      if (!res.ok) { setCharacters(initialChars); setSelected(char); }
      else router.refresh();
    });
  }

  function handleFavoriteTitleChange(char: Character, newTitle: TitleData | null) {
    const patch = (c: Character) =>
      c.name === char.name && c.realm === char.realm ? { ...c, favorite_title: newTitle } : c;
    setCharacters((prev) => prev.map(patch));
    setSelected((prev) => prev && prev.name === char.name && prev.realm === char.realm
      ? { ...prev, favorite_title: newTitle } : prev);
  }

  function handleDetailsPatch(char: Character, p: CharPatch) {
    const patch = (c: Character) =>
      c.name === char.name && c.realm === char.realm ? { ...c, ...p } : c;
    setCharacters((prev) => prev.map(patch));
    setSelected((prev) => prev && prev.name === char.name && prev.realm === char.realm
      ? { ...prev, ...p } : prev);
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-950 text-white">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-68 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Jugador */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full border-2 border-gray-600" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">{user.username}</p>
              <p className="text-gray-400 text-xs truncate">{user.guild_title}</p>
            </div>
          </div>

          {user.blizzard_battletag ? (
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-blue-400 truncate">{user.blizzard_battletag}</p>
              <form method="POST" action="/api/auth/blizzard/unlink">
                <button type="submit" title="Desconectar" className="text-gray-600 hover:text-red-400 text-xs shrink-0">✕</button>
              </form>
            </div>
          ) : (
            <Link href="http://localhost:8000/auth/blizzard/login" className="text-xs text-gray-500 hover:text-blue-400 underline mb-2 block">
              Conectar Battle.net
            </Link>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-300 font-bold text-lg">{user.total_points.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">puntos</span>
          </div>
        </div>

        {/* Cumpleaños */}
        <BirthdaySection birthday={user.birthday} isAdmin={user.role === "admin" || user.role === "officer"} />

        {/* Lista de personajes — agrupada por juego */}
        <div className="flex-1 overflow-y-auto p-3">
          {characters.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">Sin personajes</p>
          ) : (
            <CharacterList
              characters={characters}
              selected={selected}
              onSelect={handleSelect}
            />
          )}
        </div>

        <div className="p-3 border-t border-gray-800">
          <Link href="/characters" className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors">
            + Añadir desde Battle.net
          </Link>
        </div>
      </aside>

      {/* ── Contenido ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <CharacterDetail
            char={selected}
            transactions={transactions}
            onSetMain={() => handleSetMain(selected)}
            isPending={isPending}
            onFavoriteTitleChange={(t) => handleFavoriteTitleChange(selected, t)}
            onDetailsPatch={(p) => handleDetailsPatch(selected, p)}
          />
        ) : (
          <EmptyState hasBnet={user.has_blizzard} />
        )}
      </main>
    </div>
  );
}

// ── Detalle del personaje ─────────────────────────────────────────────────

type DetailTab = "points" | "lore" | "professions";

function CharacterDetail({
  char, transactions, onSetMain, isPending, onFavoriteTitleChange, onDetailsPatch,
}: {
  char: Character;
  transactions: Transaction[];
  onSetMain: () => void;
  isPending: boolean;
  onFavoriteTitleChange: (t: TitleData | null) => void;
  onDetailsPatch: (p: CharPatch) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("points");
  const color     = CLASS_COLOR[char.wow_class ?? ""] ?? "#888888";
  const className = CLASS_NAME_ES[char.wow_class ?? ""] ?? char.wow_class ?? "Desconocida";
  const raceName  = RACE_NAME_ES[char.race ?? ""] ?? char.race ?? null;
  const factionLabel = char.faction ? (FACTION_ES[char.faction] ?? char.faction) : null;
  const factionColor = char.faction ? (FACTION_COLOR[char.faction] ?? "#aaa") : "#aaa";

  // Datos personales para el grid
  const personalData: { label: string; value: string | null; color?: string }[] = [
    { label: "Clase",      value: className },
    { label: "Raza",       value: raceName },
    { label: "Facción",    value: factionLabel, color: factionColor },
    { label: "Nivel",      value: char.level ? String(char.level) : null },
    { label: "Origen",     value: char.origin },
    { label: "Residencia", value: char.residence },
    { label: "Edad",       value: char.age_lore ? `${char.age_lore} años` : null },
    { label: "Realm",      value: char.realm },
  ].filter((d) => d.value !== null) as { label: string; value: string; color?: string }[];

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "points",      label: "Puntos y logros" },
    { key: "lore",        label: "Historia y relaciones" },
    { key: "professions", label: "Profesiones" },
  ];

  return (
    <div className="p-8 max-w-2xl">

      {/* ── Cabecera con avatar ─────────────────────────────────── */}
      <div className="flex gap-6 mb-6">

        {/* Avatar */}
        <CharacterAvatar
          char={char}
          onAvatarPatch={(p) => onDetailsPatch(p)}
        />

        {/* Texto */}
        <div className="flex-1 min-w-0 pt-1">

        {/* Antetítulo */}
        {char.prefix_title && (
          <p className="text-sm text-gray-400 mb-1 italic">{char.prefix_title}</p>
        )}

        {/* Nombre + Apellido */}
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color, textShadow: `0 0 24px ${color}35` }}
        >
          {char.name}
          {char.surname && (
            <span className="ml-3 opacity-80">{char.surname}</span>
          )}
        </h1>

        {/* Título favorito */}
        {char.favorite_title && (
          <p className="text-base mt-1.5" style={{ color: "#DDB96A" }}>
            {char.favorite_title.name}
          </p>
        )}

        {/* Badge de línea temporal */}
        {char.game === "forever" ? (
          <p className="text-xs mt-1.5 font-semibold tracking-wide" style={{ color: "#f59e0b" }}>
            Warcraft Forever
          </p>
        ) : (
          <p className="text-xs mt-1.5 text-gray-600 tracking-wide">
            World of Warcraft
          </p>
        )}

        {/* Badges + acción principal */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {char.is_main && (
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-xs font-medium border border-yellow-500/25">
              Personaje principal
            </span>
          )}
          {char.is_verified && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/25">
              Verificado
            </span>
          )}
          {!char.is_main && (
            <button
              onClick={onSetMain}
              disabled={isPending}
              className="px-2.5 py-0.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs border border-gray-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "..." : "Establecer como main"}
            </button>
          )}
        </div>
        {/* fin texto */}
      </div>
      {/* fin flex cabecera */}
      </div>

      {/* ── Separador con color de clase ────────────────────────── */}
      <div className="h-px mb-6 opacity-25" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

      {/* ── Datos personales ────────────────────────────────────── */}
      {personalData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {personalData.map((d) => (
            <div key={d.label} className="bg-gray-900/70 rounded-lg px-3 py-2.5 border border-gray-800/50">
              <p className="text-xs text-gray-600 mb-0.5">{d.label}</p>
              <p className="text-sm font-medium" style={d.color ? { color: d.color } : { color: "#e5e7eb" }}>
                {d.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? "text-white border-current"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            style={tab === t.key ? { color, borderBottomColor: color } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenido del tab ───────────────────────────────────── */}
      {tab === "points" && (
        <PointsAndAchievementsTab transactions={transactions} />
      )}
      {tab === "lore" && (
        <LoreAndRelationsTab
          char={char}
          onDetailsPatch={onDetailsPatch}
          onFavoriteTitleChange={onFavoriteTitleChange}
        />
      )}
      {tab === "professions" && (
        <ProfessionsTab />
      )}
    </div>
  );
}

// ── Tab: Puntos y logros ──────────────────────────────────────────────────

function PointsAndAchievementsTab({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-8">

      {/* Historial de puntos */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Historial de puntos</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin actividad registrada aún.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900 border border-gray-800/50">
                <span className={`text-sm font-bold w-14 text-right shrink-0 ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{t.reason}</p>
                  {t.event_category && <p className="text-xs text-gray-500">{t.event_category}</p>}
                </div>
                <span className="text-xs text-gray-600 shrink-0">
                  {new Date(t.created_at).toLocaleDateString("es-ES")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Logros — próximamente */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Logros</h2>
        <div className="px-4 py-6 rounded-lg bg-gray-900/50 border border-dashed border-gray-800 text-center">
          <p className="text-gray-500 text-sm">Los logros del gremio se mostrarán aquí próximamente.</p>
        </div>
      </section>
    </div>
  );
}

// ── Tab: Historia y relaciones ────────────────────────────────────────────

function LoreAndRelationsTab({
  char, onDetailsPatch, onFavoriteTitleChange,
}: {
  char: Character;
  onDetailsPatch: (p: CharPatch) => void;
  onFavoriteTitleChange: (t: TitleData | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  // Campos editables sincronizados con el personaje
  const [surname,      setSurname]   = useState(char.surname      ?? "");
  const [prefixTitle,  setPrefix]    = useState(char.prefix_title  ?? "");
  const [biography,    setBio]       = useState(char.biography     ?? "");
  const [personality,  setPerso]     = useState(char.personality   ?? "");
  const [appearance,   setAppear]    = useState(char.appearance    ?? "");
  const [origin,       setOrigin]    = useState(char.origin        ?? "");
  const [ageLore,      setAge]       = useState(char.age_lore ? String(char.age_lore) : "");
  const [residence,    setResidence] = useState(char.residence     ?? "");
  const [saving, setSaving]          = useState(false);
  const [error, setError]            = useState<string | null>(null);

  useEffect(() => {
    setSurname(char.surname ?? "");
    setPrefix(char.prefix_title ?? "");
    setBio(char.biography ?? "");
    setPerso(char.personality ?? "");
    setAppear(char.appearance ?? "");
    setOrigin(char.origin ?? "");
    setAge(char.age_lore ? String(char.age_lore) : "");
    setResidence(char.residence ?? "");
    setEditing(false);
    setError(null);
  }, [char.name, char.realm]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      name: char.name, realm: char.realm,
      surname:      surname      || null,
      prefix_title: prefixTitle  || null,
      biography:    biography    || null,
      personality:  personality  || null,
      appearance:   appearance   || null,
      origin:       origin       || null,
      age_lore:     ageLore ? parseInt(ageLore) : null,
      residence:    residence    || null,
    };
    try {
      const res = await fetch("/api/characters/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? "Error al guardar");
      } else {
        onDetailsPatch({
          surname:      surname      || null,
          prefix_title: prefixTitle  || null,
          biography:    biography    || null,
          personality:  personality  || null,
          appearance:   appearance   || null,
          origin:       origin       || null,
          age_lore:     ageLore ? parseInt(ageLore) : null,
          residence:    residence    || null,
        });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Historia / trasfondo ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Historia y trasfondo</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-800 hover:border-gray-700 transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-5">
            {/* Identidad */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Identidad</p>
              <div className="grid grid-cols-2 gap-3">
                <LoreInput label="Antetítulo" placeholder="El gran, Archimago..." value={prefixTitle} onChange={setPrefix} />
                <LoreInput label="Apellido" placeholder="(opcional en retail)" value={surname} onChange={setSurname} />
              </div>
            </div>

            {/* Datos personales */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Datos personales</p>
              <div className="grid grid-cols-2 gap-3">
                <LoreInput label="Origen" placeholder="Ciudad, región..." value={origin} onChange={setOrigin} />
                <LoreInput label="Residencia" placeholder="Lugar actual..." value={residence} onChange={setResidence} />
                <LoreInput label="Edad (lore)" placeholder="Años" value={ageLore} onChange={setAge} type="number" />
              </div>
            </div>

            {/* Trasfondo */}
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Trasfondo narrativo</p>
              <div className="space-y-3">
                <LoreTextarea label="Historia" placeholder="Cuenta la historia de tu personaje: su origen, motivaciones, grandes gestas..." value={biography} onChange={setBio} rows={6} />
                <LoreTextarea label="Personalidad" placeholder="¿Cómo es este personaje? ¿Qué valores lo mueven?" value={personality} onChange={setPerso} rows={3} />
                <LoreTextarea label="Aspecto físico" placeholder="Describe rasgos físicos, cicatrices, vestimenta habitual..." value={appearance} onChange={setAppear} rows={3} />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null); }}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {char.biography || char.personality || char.appearance ? (
              <>
                <LoreBlock title="Historia" text={char.biography} />
                <LoreBlock title="Personalidad" text={char.personality} />
                <LoreBlock title="Aspecto físico" text={char.appearance} />
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Aún no hay trasfondo escrito. Haz clic en Editar para dar vida a este personaje.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Títulos ── */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Títulos</h2>
        <CharacterTitlesSection char={char} onFavoriteTitleChange={onFavoriteTitleChange} />
      </section>

      {/* ── Relaciones ── */}
      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Relaciones</h2>
        <RelationsSection char={char} />
      </section>
    </div>
  );
}

// ── Tab: Profesiones ──────────────────────────────────────────────────────

function ProfessionsTab() {
  return (
    <div className="px-4 py-8 rounded-xl bg-gray-900/50 border border-dashed border-gray-800 text-center">
      <p className="text-gray-400 text-sm font-medium mb-1">Profesiones</p>
      <p className="text-gray-600 text-sm">
        Las profesiones se importarán automáticamente desde Battle.net en una próxima actualización.
      </p>
    </div>
  );
}

// ── Sección títulos ───────────────────────────────────────────────────────

function CharacterTitlesSection({
  char, onFavoriteTitleChange,
}: {
  char: Character;
  onFavoriteTitleChange: (t: TitleData | null) => void;
}) {
  const [titles, setTitles] = useState<TitleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/characters/titles?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setTitles(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [char.name, char.realm]);

  async function handleSetFavorite(title: TitleData | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/characters/set-favorite-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm, title_id: title?.id ?? null }),
      });
      if (res.ok) onFavoriteTitleChange(title);
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando...</p>;
  if (titles.length === 0) return (
    <p className="text-gray-600 text-sm">Este personaje aún no tiene títulos.</p>
  );

  return (
    <ul className="space-y-2">
      {titles.map((title) => {
        const isFav = char.favorite_title?.id === title.id;
        return (
          <li key={title.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors ${isFav ? "border-yellow-500/40 bg-yellow-500/5" : "border-gray-800 bg-gray-900/50"}`}>
            <div>
              <p className={`text-sm font-medium ${isFav ? "text-yellow-400" : "text-gray-200"}`}>{title.name}</p>
              {title.description && <p className="text-xs text-gray-500 mt-0.5">{title.description}</p>}
            </div>
            <button
              onClick={() => handleSetFavorite(isFav ? null : title)}
              disabled={saving}
              className={`ml-4 text-xs px-3 py-1 rounded-lg border shrink-0 transition-colors disabled:opacity-50 ${
                isFav ? "border-yellow-500/40 text-yellow-400 hover:text-red-400 hover:border-red-500/40"
                       : "border-gray-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-500/40"
              }`}
            >
              {isFav ? "Quitar" : "Usar"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Sección relaciones ────────────────────────────────────────────────────

function RelationsSection({ char }: { char: Character }) {
  const [relations, setRelations] = useState<RelationData[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/characters/relations?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setRelations(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [char.name, char.realm]);

  async function handleDelete(id: string) {
    const res = await fetch(
      `/api/characters/relations/${id}?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`,
      { method: "DELETE" }
    );
    if (res.ok || res.status === 204) setRelations((p) => p.filter((r) => r.id !== id));
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando relaciones...</p>;

  return (
    <div className="space-y-3">
      {relations.length === 0 && !showForm && (
        <p className="text-gray-500 text-sm">Sin relaciones marcadas todavía.</p>
      )}
      {relations.map((rel) => (
        <RelationCard key={rel.id} rel={rel} onDelete={handleDelete} />
      ))}
      {showForm ? (
        <AddRelationForm
          char={char}
          onAdded={(rel) => { setRelations((p) => [...p, rel]); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-gray-500 hover:text-gray-300 px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
        >
          + Añadir relación
        </button>
      )}
    </div>
  );
}

function RelationCard({ rel, onDelete }: { rel: RelationData; onDelete: (id: string) => void }) {
  const color = CLASS_COLOR[rel.other.wow_class ?? ""] ?? "#888";
  return (
    <div className="px-4 py-3 rounded-lg bg-gray-900/70 border border-gray-800/50 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color }}>{rel.other.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{getRelationLabel(rel.relation_type)}</span>
          <span className="text-xs text-gray-600">({rel.other.owner_username})</span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5 italic">
          {rel.direction === "outgoing"
            ? `Consideras a ${rel.other.name} tu ${getRelationLabel(rel.relation_type).toLowerCase()}`
            : `${rel.other.name} te considera su ${getRelationLabel(rel.relation_type).toLowerCase()}`}
        </p>
        {rel.description && <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">{rel.description}</p>}
      </div>
      {rel.direction === "outgoing" && (
        <button onClick={() => onDelete(rel.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0 mt-0.5">✕</button>
      )}
    </div>
  );
}

function AddRelationForm({
  char, onAdded, onCancel,
}: {
  char: Character;
  onAdded: (rel: RelationData) => void;
  onCancel: () => void;
}) {
  const [query,    setQuery]   = useState("");
  const [results,  setResults] = useState<{ name: string; realm: string; wow_class: string | null; owner_username: string }[]>([]);
  const [target,   setTarget]  = useState<{ name: string; realm: string; owner_username: string } | null>(null);
  const [relType,  setRelType] = useState("ally");
  const [desc,     setDesc]    = useState("");
  const [searching,setSearch]  = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQuery(v: string) {
    setQuery(v); setTarget(null);
    if (!v.trim()) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearch(true);
      const res = await fetch(`/api/characters/search?q=${encodeURIComponent(v)}`);
      const data = res.ok ? await res.json() : [];
      setResults(data.filter((c: { name: string; realm: string }) => !(c.name === char.name && c.realm === char.realm)));
      setSearch(false);
    }, 300);
  }

  async function handleSubmit() {
    if (!target) return;
    setSaving(true); setError(null);
    const res = await fetch("/api/characters/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: char.name, realm: char.realm, to_name: target.name, to_realm: target.realm, relation_type: relType, description: desc || null }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.detail ?? "Error al añadir");
    else onAdded(data as RelationData);
    setSaving(false);
  }

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900 space-y-4">
      <p className="text-sm font-medium text-gray-300">Nueva relación</p>

      {/* Búsqueda */}
      <div className="relative">
        <label className="text-xs text-gray-500 block mb-1">Personaje</label>
        {target ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 border border-gray-600">
            <span className="text-sm text-gray-200">{target.name} <span className="text-gray-500 text-xs">({target.owner_username})</span></span>
            <button onClick={() => { setTarget(null); setQuery(""); }} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
        ) : (
          <>
            <input
              type="text" value={query} onChange={(e) => handleQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
            />
            {query && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                {searching ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Buscando...</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Sin resultados</p>
                ) : results.map((r) => (
                  <button key={`${r.name}-${r.realm}`} onClick={() => { setTarget(r); setQuery(""); setResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: CLASS_COLOR[r.wow_class ?? ""] ?? "#888" }}>{r.name}</span>
                    <span className="text-xs text-gray-500">{r.realm}</span>
                    <span className="ml-auto text-xs text-gray-600">{r.owner_username}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tipo */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Tipo</label>
        <select value={relType} onChange={(e) => setRelType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500">
          {RELATION_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Descripción (opcional)</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="Añade contexto sobre esta relación..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={!target || saving}
          className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors disabled:opacity-40">
          {saving ? "..." : "Añadir"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Avatar del personaje ──────────────────────────────────────────────────

function CharacterAvatar({
  char,
  onAvatarPatch,
}: {
  char: Character;
  onAvatarPatch: (p: CharPatch) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBlizzardRender = !char.custom_avatar_url && !!char.blizzard_character_id;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file",  file);
    fd.append("name",  char.name);
    fd.append("realm", char.realm);
    const res = await fetch("/api/characters/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? data.detail ?? "Error al subir");
    } else {
      onAvatarPatch({ pending_avatar_url: "pending" });
    }
    setUploading(false);
    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    const res = await fetch(
      `/api/characters/avatar?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`,
      { method: "DELETE" }
    );
    if (res.ok || res.status === 204) {
      onAvatarPatch({ avatar_url: null, custom_avatar_url: null, pending_avatar_url: null });
    }
  }

  return (
    <div className="relative shrink-0">
      {/* Imagen */}
      <div className="w-32 h-44 rounded-xl overflow-hidden bg-gray-800 border border-gray-700/50">
        {char.avatar_url ? (
          <img
            src={char.avatar_url}
            alt={char.name}
            className="w-full h-full object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-600 text-4xl font-bold">
              {char.name.slice(0, 1)}
            </span>
          </div>
        )}
      </div>

      {/* Etiqueta si es render Blizzard */}
      {isBlizzardRender && (
        <p className="text-xs text-gray-600 text-center mt-1">Render Blizzard</p>
      )}
      {char.custom_avatar_url && (
        <p className="text-xs text-green-600 text-center mt-1">Imagen propia</p>
      )}
      {char.pending_avatar_url && (
        <p className="text-xs text-amber-500 text-center mt-1">Pendiente aprobación</p>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-1 mt-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !!char.pending_avatar_url}
          title={char.pending_avatar_url ? "Ya tienes una imagen pendiente de aprobación" : "Subir imagen propia"}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40 text-center"
        >
          {uploading ? "Subiendo..." : char.pending_avatar_url ? "Pendiente..." : "Cambiar imagen"}
        </button>
        {(char.custom_avatar_url || char.pending_avatar_url) && (
          <button
            onClick={handleRemove}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors text-center"
          >
            Quitar imagen
          </button>
        )}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}

// ── Lista de personajes agrupada por juego ────────────────────────────────

const GAME_LABEL: Record<string, string> = {
  retail:  "World of Warcraft",
  forever: "Warcraft Forever",
};

const GAME_ACCENT: Record<string, string> = {
  retail:  "#3b82f6",   // blue-500
  forever: "#f59e0b",   // amber-500
};

function CharacterList({
  characters, selected, onSelect,
}: {
  characters: Character[];
  selected: Character | null;
  onSelect: (c: Character) => void;
}) {
  const games = ["retail", "forever"].filter((g) => characters.some((c) => (c.game ?? "retail") === g));

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const group = characters.filter((c) => (c.game ?? "retail") === game);
        const accent = GAME_ACCENT[game] ?? "#888";
        return (
          <div key={game}>
            <p
              className="text-xs font-semibold uppercase tracking-wider px-2 mb-1"
              style={{ color: accent }}
            >
              {GAME_LABEL[game] ?? game}
            </p>
            <ul className="space-y-0.5">
              {group.map((char) => {
                const color   = CLASS_COLOR[char.wow_class ?? ""] ?? "#888";
                const isActive = selected?.name === char.name && selected?.realm === char.realm && (selected?.game ?? "retail") === game;
                return (
                  <li key={`${char.name}-${char.realm}-${game}`}>
                    <button
                      onClick={() => onSelect(char)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        isActive ? "bg-gray-700 ring-1 ring-gray-600" : "hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color }}>
                          {char.name}
                          {char.surname && <span className="font-normal opacity-70"> {char.surname}</span>}
                          {char.is_main && <span className="ml-1 text-xs text-yellow-400 font-normal opacity-80">(main)</span>}
                        </p>
                        <p className="text-xs truncate mt-0.5">
                          {char.favorite_title
                            ? <span className="text-yellow-500/80">{char.favorite_title.name}</span>
                            : <span className="text-gray-500">{char.realm}</span>}
                        </p>
                      </div>
                      {char.is_verified && <span title="Verificado" className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers visuales ──────────────────────────────────────────────────────

function LoreBlock({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-xs text-gray-500 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap bg-gray-900/50 rounded-lg px-4 py-3 border border-gray-800/50">
        {text}
      </p>
    </div>
  );
}

function LoreInput({
  label, placeholder, value, onChange, type = "text",
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
      />
    </div>
  );
}

function LoreTextarea({
  label, placeholder, value, onChange, rows,
}: { label: string; placeholder: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-y leading-relaxed"
      />
    </div>
  );
}

function EmptyState({ hasBnet }: { hasBnet: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <p className="text-gray-400 mb-4">
        {hasBnet ? "Selecciona un personaje del panel izquierdo" : "Conecta tu cuenta de Battle.net para ver tus personajes"}
      </p>
      {!hasBnet && (
        <Link href="http://localhost:8000/auth/blizzard/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium">
          Conectar Battle.net
        </Link>
      )}
    </div>
  );
}

// ── Sección cumpleaños ────────────────────────────────────────────────────

function BirthdaySection({ birthday, isAdmin }: { birthday: string | null; isAdmin: boolean }) {
  const [editing, setEditing]  = useState(false);
  const [value,   setValue]    = useState("");
  const [saving,  setSaving]   = useState(false);
  const [error,   setError]    = useState<string | null>(null);
  const [current, setCurrent]  = useState<string | null>(birthday);
  const router = useRouter();

  function fmt(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }

  async function handleSave() {
    if (!value) return;
    setSaving(true); setError(null);
    const res = await fetch("/api/users/birthday", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday: value }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.detail ?? "Error al guardar");
    else { setCurrent(data.birthday); setEditing(false); router.refresh(); }
    setSaving(false);
  }

  const canEdit = !current || isAdmin;

  return (
    <div className="px-5 py-4 border-b border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cumpleaños</p>
      {current && !editing ? (
        <div>
          <p className="text-sm text-gray-200">{fmt(current)}</p>
          {canEdit
            ? <button onClick={() => { setValue(current); setEditing(true); }} className="text-xs text-gray-500 hover:text-gray-300 mt-1">Modificar</button>
            : <p className="text-xs text-gray-600 mt-1">Contacta con el Líder para modificarla.</p>}
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !value} className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{saving ? "..." : "Guardar"}</button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          <p className="text-xs text-gray-600">Solo podrás modificarla si hay un error.</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleSave} disabled={saving || !value} className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{saving ? "..." : "Guardar"}</button>
        </div>
      )}
    </div>
  );
}
