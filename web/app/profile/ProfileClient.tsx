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
  realm: string;
  wow_class: string | null;
  race: string | null;
  role_function: string | null;
  level: number | null;
  is_main: boolean;
  is_alt: boolean;
  is_verified: boolean;
  favorite_title: TitleData | null;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
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
  other: {
    name: string;
    realm: string;
    wow_class: string | null;
    owner_username: string;
  };
};

// ── Datos de clases WoW ───────────────────────────────────────────────────

const CLASS_COLOR: Record<string, string> = {
  WARRIOR: "#C79C6E", PALADIN: "#F58CBA", HUNTER: "#ABD473",
  ROGUE: "#FFF569", PRIEST: "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN: "#0070DE", MAGE: "#69CCF0", WARLOCK: "#9482C9",
  MONK: "#00FF96", DRUID: "#FF7D0A", DEMONHUNTER: "#A330C9",
  EVOKER: "#33937F",
};

const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador",
  ROGUE: "Pícaro", PRIEST: "Sacerdote", DEATH_KNIGHT: "Caballero de la Muerte",
  SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo",
  MONK: "Monje", DRUID: "Druida", DEMONHUNTER: "Cazador de Demonios",
  EVOKER: "Evocador",
};

const RACE_NAME_ES: Record<string, string> = {
  HUMAN: "Humano", ORC: "Orco", DWARF: "Enano", NIGHT_ELF: "Elfo de la noche",
  UNDEAD: "No-muerto", TAUREN: "Tauren", GNOME: "Gnomo", TROLL: "Troll",
  BLOOD_ELF: "Elfo de sangre", DRAENEI: "Draenei", WORGEN: "Huargen",
  PANDAREN: "Pandaren", NIGHTBORNE: "Nacido de la noche",
  HIGHMOUNTAIN_TAUREN: "Tauren de la Cima", VOID_ELF: "Elfo del vacío",
  LIGHTFORGED: "Forjado a la Luz", DARK_IRON_DWARF: "Enano Hierro Negro",
  KUL_TIRAN: "Kul Tirano", MECHAGNOME: "Mecagnomo", ZANDALARI: "Trol zandalari",
  GOBLIN: "Goblin", VULPERA: "Vulpera", MAGHAR_ORC: "Orco Mag'har",
  DRACTHYR: "Dracthyr",
};

const ROLE_LABEL: Record<string, string> = {
  TANK: "Tank", HEALER: "Healer",
  DPS_MELEE: "DPS Melé", DPS_RANGED: "DPS a distancia",
};

export const RELATION_TYPES: { value: string; label: string }[] = [
  { value: "ally",        label: "Aliado/a" },
  { value: "rival",       label: "Rival" },
  { value: "family",      label: "Familiar" },
  { value: "mentor",      label: "Mentor" },
  { value: "apprentice",  label: "Aprendiz" },
  { value: "friend",      label: "Amigo/a" },
  { value: "enemy",       label: "Enemigo/a" },
  { value: "romantic",    label: "Interés romántico" },
  { value: "companion",   label: "Compañero/a de aventuras" },
];

function getRelationLabel(type: string) {
  return RELATION_TYPES.find((r) => r.value === type)?.label ?? type;
}

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
    const updated = characters.map((c) =>
      c.name === char.name && c.realm === char.realm ? { ...c, favorite_title: newTitle } : c
    );
    setCharacters(updated);
    setSelected((prev) =>
      prev && prev.name === char.name && prev.realm === char.realm
        ? { ...prev, favorite_title: newTitle }
        : prev
    );
  }

  function handleBioChange(char: Character, patch: Partial<Pick<Character, "biography" | "personality" | "appearance">>) {
    const updated = characters.map((c) =>
      c.name === char.name && c.realm === char.realm ? { ...c, ...patch } : c
    );
    setCharacters(updated);
    setSelected((prev) =>
      prev && prev.name === char.name && prev.realm === char.realm
        ? { ...prev, ...patch }
        : prev
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-950 text-white">

      {/* ── Sidebar izquierdo ──────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Datos del jugador */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-14 h-14 rounded-full border-2 border-gray-600"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-lg leading-tight">{user.username}</p>
              <p className="text-gray-400 text-sm">{user.guild_title}</p>
            </div>
          </div>

          {user.blizzard_battletag ? (
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm text-blue-400">{user.blizzard_battletag}</p>
              <form method="POST" action="/api/auth/blizzard/unlink">
                <button type="submit" title="Desconectar" className="text-gray-600 hover:text-red-400 text-xs">
                  ✕
                </button>
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

        {/* Lista de personajes */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">Personajes</p>
          {characters.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">Sin personajes</p>
          ) : (
            <ul className="space-y-1">
              {characters.map((char) => {
                const color = CLASS_COLOR[char.wow_class ?? ""] ?? "#888";
                const isSelected = selected?.name === char.name && selected?.realm === char.realm;
                return (
                  <li key={`${char.name}-${char.realm}`}>
                    <button
                      onClick={() => setSelected(char)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        isSelected ? "bg-gray-700 ring-1 ring-gray-500" : "hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color }}>
                          {char.name}
                          {char.is_main && <span className="ml-1 text-xs text-yellow-400 font-normal">(main)</span>}
                        </p>
                        <p className="text-xs truncate mt-0.5">
                          {char.favorite_title ? (
                            <span className="text-yellow-500/80">{char.favorite_title.name}</span>
                          ) : (
                            <span className="text-gray-500">{char.realm}</span>
                          )}
                        </p>
                      </div>
                      {char.is_verified && (
                        <span title="Verificado" className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-gray-800">
          <Link href="/characters" className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors">
            + Añadir desde Battle.net
          </Link>
        </div>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <CharacterDetail
            char={selected}
            transactions={transactions}
            onSetMain={() => handleSetMain(selected)}
            isPending={isPending}
            onFavoriteTitleChange={(t) => handleFavoriteTitleChange(selected, t)}
            onBioChange={(patch) => handleBioChange(selected, patch)}
          />
        ) : (
          <EmptyState hasBnet={user.has_blizzard} />
        )}
      </main>
    </div>
  );
}

// ── Detalle del personaje (con tabs) ─────────────────────────────────────

type CharTab = "info" | "lore" | "relations" | "titles" | "activity";

function CharacterDetail({
  char,
  transactions,
  onSetMain,
  isPending,
  onFavoriteTitleChange,
  onBioChange,
}: {
  char: Character;
  transactions: Transaction[];
  onSetMain: () => void;
  isPending: boolean;
  onFavoriteTitleChange: (t: TitleData | null) => void;
  onBioChange: (patch: Partial<Pick<Character, "biography" | "personality" | "appearance">>) => void;
}) {
  const [tab, setTab] = useState<CharTab>("info");
  const color     = CLASS_COLOR[char.wow_class ?? ""] ?? "#888888";
  const className = CLASS_NAME_ES[char.wow_class ?? ""] ?? char.wow_class ?? "Desconocida";
  const raceName  = RACE_NAME_ES[char.race ?? ""] ?? char.race ?? null;
  const roleLabel = ROLE_LABEL[char.role_function ?? ""] ?? null;

  const tabs: { key: CharTab; label: string }[] = [
    { key: "info",      label: "Info" },
    { key: "lore",      label: "Trasfondo" },
    { key: "relations", label: "Relaciones" },
    { key: "titles",    label: "Títulos" },
    { key: "activity",  label: "Actividad" },
  ];

  return (
    <div className="p-8 max-w-2xl">

      {/* Cabecera */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold" style={{ color, textShadow: `0 0 20px ${color}40` }}>
          {char.name}
        </h1>

        {char.favorite_title && (
          <p className="text-lg mt-1" style={{ color: "#E8C96D" }}>
            {char.favorite_title.name}
          </p>
        )}

        <p className="text-gray-400 text-base mt-1">
          {[char.level ? `Nivel ${char.level}` : null, className, raceName, char.realm]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="flex gap-2 mt-3 flex-wrap">
          {char.is_main && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium border border-yellow-500/30">
              Personaje principal
            </span>
          )}
          {char.is_verified && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
              Verificado por Blizzard
            </span>
          )}
          {roleLabel && (
            <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
              {roleLabel}
            </span>
          )}
        </div>

        {!char.is_main && (
          <button
            onClick={onSetMain}
            disabled={isPending}
            className="mt-4 px-4 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? "Actualizando..." : "Establecer como personaje principal"}
          </button>
        )}
      </div>

      {/* Separador */}
      <div className="h-px mb-5 opacity-30" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? "border-b-current text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
            style={tab === t.key ? { color, borderBottomColor: color } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === "info" && (
        <InfoTab char={char} className={className} raceName={raceName} roleLabel={roleLabel} />
      )}
      {tab === "lore" && (
        <LoreTab char={char} onBioChange={onBioChange} />
      )}
      {tab === "relations" && (
        <RelationsTab char={char} />
      )}
      {tab === "titles" && (
        <CharacterTitlesSection char={char} onFavoriteTitleChange={onFavoriteTitleChange} />
      )}
      {tab === "activity" && (
        <ActivityTab transactions={transactions} />
      )}
    </div>
  );
}

// ── Tab: Info ─────────────────────────────────────────────────────────────

function InfoTab({
  char, className, raceName, roleLabel,
}: {
  char: Character;
  className: string;
  raceName: string | null;
  roleLabel: string | null;
}) {
  const cards: { label: string; value: string }[] = [
    { label: "Clase",  value: className },
    { label: "Realm",  value: char.realm },
    ...(raceName  ? [{ label: "Raza",    value: raceName }] : []),
    ...(char.level ? [{ label: "Nivel",  value: String(char.level) }] : []),
    ...(roleLabel  ? [{ label: "Función", value: roleLabel }]         : []),
    { label: "Estado", value: char.is_verified ? "Verificado" : "Sin verificar" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="px-4 py-3 rounded-lg bg-gray-900">
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p className="text-sm font-medium text-gray-200">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Lore / Trasfondo ─────────────────────────────────────────────────

function LoreTab({
  char, onBioChange,
}: {
  char: Character;
  onBioChange: (patch: Partial<Pick<Character, "biography" | "personality" | "appearance">>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio]           = useState(char.biography ?? "");
  const [personality, setPerso] = useState(char.personality ?? "");
  const [appearance, setAppear] = useState(char.appearance ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Sincronizar campos cuando cambia de personaje
  useEffect(() => {
    setBio(char.biography ?? "");
    setPerso(char.personality ?? "");
    setAppear(char.appearance ?? "");
    setEditing(false);
    setError(null);
  }, [char.name, char.realm]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/characters/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: char.name,
          realm: char.realm,
          biography:   bio   || null,
          personality: personality || null,
          appearance:  appearance  || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail ?? "Error al guardar");
      } else {
        onBioChange({
          biography:   bio   || null,
          personality: personality || null,
          appearance:  appearance  || null,
        });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasContent = char.biography || char.personality || char.appearance;

  if (!editing) {
    return (
      <div className="space-y-6">
        {hasContent ? (
          <>
            <LoreBlock title="Historia" text={char.biography} />
            <LoreBlock title="Personalidad" text={char.personality} />
            <LoreBlock title="Aspecto físico" text={char.appearance} />
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            Este personaje aún no tiene trasfondo escrito. Dale vida con una historia, personalidad y descripción física.
          </p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="mt-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 border border-gray-700 transition-colors"
        >
          {hasContent ? "Editar trasfondo" : "Añadir trasfondo"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <LoreTextarea
        label="Historia"
        placeholder="Cuenta la historia de tu personaje: su origen, motivaciones, grandes gestas..."
        value={bio}
        onChange={setBio}
        rows={6}
      />
      <LoreTextarea
        label="Personalidad"
        placeholder="¿Cómo es este personaje? ¿Qué valores lo mueven? ¿Cómo se relaciona con los demás?"
        value={personality}
        onChange={setPerso}
        rows={4}
      />
      <LoreTextarea
        label="Aspecto físico"
        placeholder="Describe el aspecto físico, cicatrices, vestimenta habitual, rasgos distintivos..."
        value={appearance}
        onChange={setAppear}
        rows={4}
      />

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
          onClick={() => {
            setBio(char.biography ?? "");
            setPerso(char.personality ?? "");
            setAppear(char.appearance ?? "");
            setEditing(false);
            setError(null);
          }}
          className="px-4 py-2 rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function LoreBlock({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap bg-gray-900/50 rounded-lg px-4 py-3 border border-gray-800">
        {text}
      </div>
    </div>
  );
}

function LoreTextarea({
  label, placeholder, value, onChange, rows,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-y leading-relaxed"
      />
    </div>
  );
}

// ── Tab: Relaciones ───────────────────────────────────────────────────────

function RelationsTab({ char }: { char: Character }) {
  const [relations, setRelations]   = useState<RelationData[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRelations([]);
    fetch(`/api/characters/relations?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled) setRelations(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [char.name, char.realm]);

  async function handleDelete(relId: string) {
    const res = await fetch(
      `/api/characters/relations/${relId}?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`,
      { method: "DELETE" }
    );
    if (res.ok || res.status === 204) {
      setRelations((prev) => prev.filter((r) => r.id !== relId));
    }
  }

  function handleAdded(rel: RelationData) {
    setRelations((prev) => [...prev, rel]);
    setShowForm(false);
    setError(null);
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando relaciones...</p>;

  return (
    <div className="space-y-4">
      {relations.length === 0 && !showForm && (
        <p className="text-gray-500 text-sm">
          Este personaje aún no tiene relaciones marcadas. Puedes añadir conexiones con otros miembros de la hermandad.
        </p>
      )}

      {/* Lista de relaciones */}
      {relations.map((rel) => (
        <RelationCard key={rel.id} rel={rel} onDelete={handleDelete} />
      ))}

      {/* Formulario de nueva relación */}
      {showForm ? (
        <AddRelationForm
          char={char}
          existingRelations={relations}
          onAdded={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 border border-gray-700 transition-colors"
        >
          + Añadir relación
        </button>
      )}
    </div>
  );
}

function RelationCard({ rel, onDelete }: { rel: RelationData; onDelete: (id: string) => void }) {
  const color = CLASS_COLOR[rel.other.wow_class ?? ""] ?? "#888";
  const typeLabel = getRelationLabel(rel.relation_type);

  const directionText =
    rel.direction === "outgoing"
      ? `Consideras a ${rel.other.name} tu ${typeLabel.toLowerCase()}`
      : `${rel.other.name} te considera su ${typeLabel.toLowerCase()}`;

  return (
    <div className="px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color }}>{rel.other.name}</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
            {typeLabel}
          </span>
          <span className="text-xs text-gray-600">({rel.other.owner_username})</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 italic">{directionText}</p>
        {rel.description && (
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">{rel.description}</p>
        )}
      </div>
      {rel.direction === "outgoing" && (
        <button
          onClick={() => onDelete(rel.id)}
          title="Eliminar relación"
          className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0 mt-0.5"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function AddRelationForm({
  char,
  existingRelations,
  onAdded,
  onCancel,
}: {
  char: Character;
  existingRelations: RelationData[];
  onAdded: (rel: RelationData) => void;
  onCancel: () => void;
}) {
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<{ name: string; realm: string; wow_class: string | null; owner_username: string; is_own: boolean }[]>([]);
  const [selected, setSelected]       = useState<{ name: string; realm: string; owner_username: string } | null>(null);
  const [relationType, setRelType]    = useState("ally");
  const [description, setDesc]        = useState("");
  const [searching, setSearching]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(v: string) {
    setQuery(v);
    setSelected(null);
    if (!v.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/characters/search?q=${encodeURIComponent(v)}`);
      const data = res.ok ? await res.json() : [];
      // Filtrar el propio personaje
      setResults(data.filter((c: { name: string; realm: string }) => !(c.name === char.name && c.realm === char.realm)));
      setSearching(false);
    }, 300);
  }

  async function handleSubmit() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/characters/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: char.name,
          realm: char.realm,
          to_name: selected.name,
          to_realm: selected.realm,
          relation_type: relationType,
          description: description || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Error al añadir la relación");
      } else {
        onAdded(data as RelationData);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900 space-y-4">
      <h3 className="text-sm font-medium text-gray-300">Nueva relación</h3>

      {/* Búsqueda de personaje */}
      <div className="relative">
        <label className="text-xs text-gray-500 block mb-1">Personaje</label>
        {selected ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 border border-gray-600">
            <span className="text-sm text-gray-200">{selected.name} · {selected.realm} <span className="text-gray-500 text-xs">({selected.owner_username})</span></span>
            <button onClick={() => { setSelected(null); setQuery(""); }} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
            />
            {query && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                {searching ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Buscando...</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Sin resultados</p>
                ) : (
                  results.map((r) => {
                    const color = CLASS_COLOR[r.wow_class ?? ""] ?? "#888";
                    return (
                      <button
                        key={`${r.name}-${r.realm}`}
                        onClick={() => { setSelected(r); setQuery(""); setResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <span className="text-sm font-medium" style={{ color }}>{r.name}</span>
                        <span className="text-xs text-gray-500">{r.realm}</span>
                        <span className="ml-auto text-xs text-gray-600">{r.owner_username}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tipo de relación */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Tipo de relación</label>
        <select
          value={relationType}
          onChange={(e) => setRelType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500"
        >
          {RELATION_TYPES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Descripción opcional */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Descripción (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Añade contexto sobre esta relación..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!selected || saving}
          className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm transition-colors disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Añadir"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-gray-400 hover:text-gray-200 text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Tab: Títulos ──────────────────────────────────────────────────────────

function CharacterTitlesSection({
  char, onFavoriteTitleChange,
}: {
  char: Character;
  onFavoriteTitleChange: (t: TitleData | null) => void;
}) {
  const [titles, setTitles]   = useState<TitleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTitles([]);
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
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando títulos...</p>;

  if (titles.length === 0) return (
    <p className="text-gray-500 text-sm">Este personaje aún no tiene títulos. Los títulos se otorgan desde el panel de administración.</p>
  );

  return (
    <ul className="space-y-2">
      {titles.map((title) => {
        const isFavorite = char.favorite_title?.id === title.id;
        return (
          <li
            key={title.id}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
              isFavorite ? "border-yellow-500/50 bg-yellow-500/5" : "border-gray-800 bg-gray-900"
            }`}
          >
            <div>
              <p className={`text-sm font-medium ${isFavorite ? "text-yellow-400" : "text-gray-200"}`}>
                {title.name}
              </p>
              {title.description && <p className="text-xs text-gray-500 mt-0.5">{title.description}</p>}
              <p className="text-xs text-gray-600 capitalize mt-0.5">{title.source}</p>
            </div>
            <button
              onClick={() => handleSetFavorite(isFavorite ? null : title)}
              disabled={saving}
              className={`ml-4 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50 ${
                isFavorite
                  ? "border-yellow-500/50 text-yellow-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50"
                  : "border-gray-700 text-gray-400 hover:border-yellow-500/50 hover:text-yellow-400"
              }`}
            >
              {isFavorite ? "Quitar" : "Usar como título"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Tab: Actividad ─────────────────────────────────────────────────────────

function ActivityTab({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return (
    <p className="text-gray-500 text-sm">Sin actividad registrada aún.</p>
  );

  return (
    <ul className="space-y-2">
      {transactions.map((t, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900">
          <span className={`text-sm font-bold w-16 text-right ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
            {t.amount > 0 ? "+" : ""}{t.amount}
          </span>
          <div className="flex-1">
            <p className="text-sm text-gray-200">{t.reason}</p>
            {t.event_category && <p className="text-xs text-gray-500">{t.event_category}</p>}
          </div>
          <span className="text-xs text-gray-600">
            {new Date(t.created_at).toLocaleDateString("es-ES")}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function EmptyState({ hasBnet }: { hasBnet: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <p className="text-gray-400 mb-4">
        {hasBnet
          ? "Selecciona un personaje del menú izquierdo"
          : "Conecta tu cuenta de Battle.net para ver tus personajes"}
      </p>
      {!hasBnet && (
        <Link href="http://localhost:8000/auth/blizzard/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium">
          Conectar Battle.net
        </Link>
      )}
    </div>
  );
}

// ── Sección de cumpleaños ──────────────────────────────────────────────────

function BirthdaySection({ birthday, isAdmin }: { birthday: string | null; isAdmin: boolean }) {
  const [editing, setEditing]  = useState(false);
  const [value, setValue]      = useState("");
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState<string | null>(null);
  const [current, setCurrent]  = useState<string | null>(birthday);
  const router = useRouter();

  function formatBirthday(iso: string) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }

  async function handleSave() {
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: value }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Error al guardar"); }
      else { setCurrent(data.birthday); setEditing(false); router.refresh(); }
    } finally { setSaving(false); }
  }

  const canEdit = !current || isAdmin;

  return (
    <div className="px-5 py-4 border-b border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cumpleaños</p>
      {current && !editing ? (
        <div>
          <p className="text-sm text-gray-200">{formatBirthday(current)}</p>
          {canEdit ? (
            <button onClick={() => { setValue(current); setEditing(true); }} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">
              Modificar
            </button>
          ) : (
            <p className="text-xs text-gray-600 mt-1">Contacta con el Líder para modificarla.</p>
          )}
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !value} className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
            <button onClick={() => { setEditing(false); setError(null); }} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 transition-colors">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500" />
          <p className="text-xs text-gray-600">Solo podrás modificarla si hay un error.</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleSave} disabled={saving || !value} className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      )}
    </div>
  );
}
