"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWatermarkBox } from "../components/HomeLogo";
import PublishStoryPanel from "./PublishStoryPanel";
import BioQuestionnaire from "./BioQuestionnaire";
import ClaimsInbox from "./ClaimsInbox";
import { mergePublicFields, PUBLIC_FIELD_LABELS, type PublicFields } from "@/lib/wiki";
import { answersComplete, mergeAnswers, type BioAnswers, type BioQuestion } from "@/lib/bio";

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
  render_url: string | null;
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
  bio_status: "draft" | "pending" | "published";
  bio_answers: BioAnswers;
  bio_answers_pending: boolean;
  bio_rejection_reason: string | null;
  published_story_id: string | null;
  public_fields: PublicFields;
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
  "avatar_url" | "custom_avatar_url" | "pending_avatar_url" |
  "bio_status" | "published_story_id" | "public_fields" |
  "bio_answers" | "bio_answers_pending" | "bio_rejection_reason"
>>;

// ── Componente principal ───────────────────────────────────────────────────

export default function ProfileClient({
  user,
  characters: initialChars,
  transactions,
  bnetTokenExpired = false,
}: {
  user: User;
  characters: Character[];
  transactions: Transaction[];
  bnetTokenExpired?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [characters, setCharacters] = useState<Character[]>(initialChars);
  const [selected, setSelected] = useState<Character | null>(initialChars[0] ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleSelect(char: Character) {
    const fresh = characters.find((c) => c.name === char.name && c.realm === char.realm) ?? char;
    setSelected(fresh);
    setSidebarOpen(false); // cerrar sidebar en mobile al seleccionar
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
    <div className="flex text-white relative">

      {/* ── Overlay backdrop (mobile) ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Contenido ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col h-[calc(100vh-3rem)] overflow-hidden">

        {/* Barra superior mobile: hamburguesa a la derecha, junto al cajón */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-gray-800 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        {selected ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CharacterDetail
              char={selected}
              transactions={transactions}
              onSetMain={() => handleSetMain(selected)}
              isPending={isPending}
              onFavoriteTitleChange={(t) => handleFavoriteTitleChange(selected, t)}
              onDetailsPatch={(p) => handleDetailsPatch(selected, p)}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <EmptyState hasBnet={user.has_blizzard} />
          </div>
        )}
      </main>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 right-0 z-40 w-72 bg-gray-900 border-l border-gray-800
          flex flex-col transition-transform duration-300
          md:sticky md:top-12 md:inset-auto md:translate-x-0
          md:w-72 md:shrink-0 md:h-[calc(100vh-3rem)] md:z-30
          ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Jugador */}
        <div className="relative p-5 border-b border-gray-800">
          {/* Botón cerrar sidebar (mobile) */}
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>

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

          {/* Aviso token caducado */}
          {bnetTokenExpired && (
            <div className="mt-2 mb-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
              <p className="text-xs text-amber-400 font-medium mb-1">Token de Battle.net caducado</p>
              <Link
                href="http://localhost:8000/auth/blizzard/login"
                className="text-xs text-amber-300 hover:text-amber-100 underline"
              >
                Reconectar para actualizar renders
              </Link>
            </div>
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

  const personalData: { label: string; value: string | null; color?: string }[] = [
    { label: "Raza",       value: raceName },
    { label: "Clase",      value: char.wow_class ? className : null },
    { label: "Facción",    value: factionLabel, color: factionColor },
    { label: "Edad",       value: char.age_lore ? `${char.age_lore} años` : null },
    { label: "Origen",     value: char.origin },
    { label: "Residencia", value: char.residence },
  ].filter((d) => d.value !== null) as { label: string; value: string; color?: string }[];

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "points",      label: "Puntos y logros" },
    { key: "lore",        label: "Trasfondo" },
    { key: "professions", label: "Profesiones" },
  ];

  const [mobileAvatarOpen, setMobileAvatarOpen] = useState(false);
  const logo = useWatermarkBox();
  const factPad = Math.round(logo.left + logo.size + 64);
  const nameTop = `calc(5rem + 220px - ${logo.size / 2}px)`;
  const factStyle = {
    ["--fact-pad" as string]: `${factPad}px`,
    ["--name-top" as string]: nameTop,
  };

  const hasGoodRender = !!(char.avatar_url && (!char.render_url?.endsWith("-avatar.jpg") || !!char.custom_avatar_url));

  return (
    <div className="relative flex flex-col h-full overflow-hidden">

      {/* ── sm+: imagen en la columna de detalle, sin invadir el aside ─ */}
      {hasGoodRender ? (
        <div className="absolute inset-y-0 right-0 w-[58%] pointer-events-none select-none hidden sm:block" style={{ zIndex: 0 }} aria-hidden>
          <img
            src={char.avatar_url!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[50%_5%]"
            style={{ opacity: 0.28 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to right, #030712 0%, #030712 6%, rgba(3,7,18,0.92) 18%, rgba(3,7,18,0.72) 32%, rgba(3,7,18,0.40) 48%, rgba(3,7,18,0.10) 65%, transparent 78%)",
                "linear-gradient(to top, #030712 0%, rgba(3,7,18,0.7) 12%, transparent 30%)",
                "linear-gradient(to bottom, rgba(3,7,18,0.5) 0%, transparent 20%)",
              ].join(", "),
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-y-0 right-0 w-[40%] pointer-events-none select-none hidden sm:block"
          style={{ zIndex: 0, background: `linear-gradient(to left, ${color}08 0%, transparent 100%)` }}
          aria-hidden
        />
      )}

      {/* ══ MOBILE: imagen corta + datos a la derecha ═════════════ */}
      <div className="sm:hidden shrink-0 relative z-10">
        {/* Banner — solo imagen. Tocar para cambiar/quitar. */}
        <button
          type="button"
          className="relative h-28 w-full overflow-hidden select-none"
          onClick={() => setMobileAvatarOpen(v => !v)}
          aria-label="Gestionar imagen del personaje"
        >
          {hasGoodRender ? (
            <img
              src={char.avatar_url!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-[50%_10%]"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(160deg, ${color}25 0%, #030712 100%)` }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, #030712 100%)" }} />

          {char.pending_avatar_url && (
            <span className="absolute top-2 left-2 text-[10px] text-amber-300 bg-black/70 rounded-full px-2 py-0.5">
              Pendiente
            </span>
          )}
        </button>

        {mobileAvatarOpen && (
          <div className="absolute inset-x-0 top-0 h-28 z-20 bg-black/85 flex items-center justify-center">
            <MobileAvatarPanel
              char={char}
              onAvatarPatch={onDetailsPatch}
              onClose={() => setMobileAvatarOpen(false)}
            />
          </div>
        )}

        {/* Nombre y, debajo, datos del personaje */}
        <div className="px-3 pt-2 pb-1">
          <div className="min-w-0">
            {char.prefix_title && (
              <p className="text-[10px] text-gray-400 italic truncate">{char.prefix_title}</p>
            )}
            <h1 className="text-lg font-bold leading-tight truncate" style={{ color }}>
              {char.name}{char.surname ? ` ${char.surname}` : ""}
            </h1>
            {char.favorite_title && (
              <p className="text-[11px] truncate" style={{ color: "#DDB96A" }}>
                {char.favorite_title.name}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {char.game === "forever" && (
                <span className="text-[9px] font-semibold" style={{ color: "#f59e0b" }}>Forever</span>
              )}
              {char.is_main && (
                <span className="px-1.5 py-px rounded-full bg-yellow-500/15 text-yellow-400 text-[9px] border border-yellow-500/25">
                  Main
                </span>
              )}
              {char.is_verified && (
                <span className="px-1.5 py-px rounded-full bg-blue-500/15 text-blue-400 text-[9px] border border-blue-500/25">
                  Verificado
                </span>
              )}
              {!char.is_main && (
                <button
                  onClick={onSetMain}
                  disabled={isPending}
                  className="px-1.5 py-px rounded-full bg-gray-800 text-gray-400 text-[9px] border border-gray-700 disabled:opacity-50"
                >
                  {isPending ? "..." : "Hacer main"}
                </button>
              )}
            </div>
          </div>

          {personalData.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {personalData.map((d) => (
                <div key={d.label} className="min-w-0 bg-gray-900/70 rounded-md px-2 py-1 border border-gray-800/50">
                  <p className="text-[8px] leading-none text-gray-600 uppercase tracking-wide">{d.label}</p>
                  <p
                    className="text-[10px] leading-tight font-medium truncate"
                    style={{ color: d.color ?? "#d1d5db" }}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ DESKTOP: cabecera + datos personales ══════════════════ */}
      <div
        className="hidden sm:block relative z-10 px-8 pt-8 pb-0 shrink-0 lg:pl-[var(--fact-pad)] lg:pt-[var(--name-top)]"
        style={factStyle}
      >

        {/* Cabecera: texto + controles de imagen */}
        <div className="flex items-start justify-between mb-5 gap-4">
          <div className="min-w-0">
            {char.prefix_title && (
              <p className="text-sm text-gray-400 mb-1 italic">{char.prefix_title}</p>
            )}
            <h1
              className="text-4xl font-bold tracking-tight leading-10"
              style={{ color, textShadow: `0 0 24px ${color}35` }}
            >
              {char.name}
              {char.surname && <span className="ml-3 opacity-80">{char.surname}</span>}
            </h1>
            {char.favorite_title && (
              <p className="text-base mt-1.5" style={{ color: "#DDB96A" }}>
                {char.favorite_title.name}
              </p>
            )}
            {char.game === "forever" ? (
              <p className="text-xs mt-1.5 font-semibold tracking-wide" style={{ color: "#f59e0b" }}>Warcraft Forever</p>
            ) : (
              <p className="text-xs mt-1.5 text-gray-600 tracking-wide">World of Warcraft</p>
            )}
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
          </div>
          <CharacterAvatar char={char} onAvatarPatch={(p) => onDetailsPatch(p)} />
        </div>

        {personalData.length > 0 && (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 mb-4 max-w-xl">
            {personalData.map((d) => (
              <div key={d.label} className="bg-gray-900/70 rounded-lg px-3 py-2 border border-gray-800/50">
                <p className="text-xs text-gray-600 mb-0.5">{d.label}</p>
                <p className="text-sm font-medium truncate" style={d.color ? { color: d.color } : { color: "#e5e7eb" }}>
                  {d.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Separador */}
        <div className="h-px mb-4 opacity-25" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
      </div>

      {/* ══ TABS BAR (compartida mobile + desktop) ════════════════ */}
      <div
        className="relative z-10 shrink-0 px-4 sm:px-8 lg:pl-[var(--fact-pad)]"
        style={factStyle}
      >
        <div className="flex gap-1 border-b border-gray-800 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors -mb-px border-b-2 whitespace-nowrap shrink-0 ${
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
      </div>

      {/* ══ ZONA SCROLLEABLE ══════════════════════════════════════ */}
      <div
        className="relative z-10 flex-1 overflow-y-auto min-h-0 px-4 sm:px-8 py-4 sm:py-6 lg:pl-[var(--fact-pad)]"
        style={factStyle}
      >
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
          <ProfessionsTab char={char} color={color} />
        )}
      </div>

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
  const published = char.bio_status === "published" && !!char.biography;
  const answersLocked = char.bio_answers_pending;
  const [questions, setQuestions] = useState<BioQuestion[]>([]);
  const [answers, setAnswers] = useState<BioAnswers>(char.bio_answers ?? {});
  const [surname, setSurname] = useState(char.surname ?? "");
  const [prefixTitle, setPrefix] = useState(char.prefix_title ?? "");
  const [origin, setOrigin] = useState(char.origin ?? "");
  const [ageLore, setAge] = useState(char.age_lore ? String(char.age_lore) : "");
  const [residence, setResidence] = useState(char.residence ?? "");
  const [publicFields, setPublicFields] = useState<PublicFields>(mergePublicFields(char.public_fields));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bios/questions")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setQuestions(list);
        setAnswers(mergeAnswers(list, char.bio_answers));
      })
      .catch(() => setQuestions([]));
  }, [char.name, char.realm]);

  useEffect(() => {
    setSurname(char.surname ?? "");
    setPrefix(char.prefix_title ?? "");
    setOrigin(char.origin ?? "");
    setAge(char.age_lore ? String(char.age_lore) : "");
    setResidence(char.residence ?? "");
    setPublicFields(mergePublicFields(char.public_fields));
    setError(null);
  }, [char.name, char.realm]);

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    const payload = {
      name: char.name,
      realm: char.realm,
      surname: surname || null,
      prefix_title: prefixTitle || null,
      origin: origin || null,
      age_lore: ageLore ? parseInt(ageLore) : null,
      residence: residence || null,
      public_fields: publicFields,
      bio_answers: answersLocked ? undefined : answers,
    };
    try {
      const res = await fetch("/api/characters/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(typeof d.detail === "string" ? d.detail : "Error al guardar");
      } else {
        const updated = await res.json();
        onDetailsPatch({
          surname: surname || null,
          prefix_title: prefixTitle || null,
          origin: origin || null,
          age_lore: ageLore ? parseInt(ageLore) : null,
          residence: residence || null,
          public_fields: publicFields,
          bio_answers: updated.bio_answers ?? answers,
          bio_answers_pending: updated.bio_answers_pending,
          bio_status: updated.bio_status,
          bio_rejection_reason: updated.bio_rejection_reason,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitAnswers() {
    setSending(true);
    setError(null);
    try {
      if (!answersLocked) {
        const save = await fetch("/api/characters/bio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: char.name,
            realm: char.realm,
            bio_answers: answers,
          }),
        });
        if (!save.ok) {
          const d = await save.json();
          setError(typeof d.detail === "string" ? d.detail : "Error al guardar el cuestionario");
          return;
        }
      }
      const res = await fetch("/api/characters/bio/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "No se pudo enviar");
      } else {
        onDetailsPatch({
          bio_answers: data.bio_answers ?? answers,
          bio_answers_pending: data.bio_answers_pending,
          bio_status: data.bio_status,
          bio_rejection_reason: data.bio_rejection_reason,
        });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      {published && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xs text-gray-500 uppercase tracking-wider">Ficha pública</h2>
              <p className="text-sm text-gray-400 mt-1">
                La biografía la escribe el Eremita a partir del cuestionario. Las historias van aparte.
              </p>
            </div>
            <Link
              href={`/personajes/${encodeURIComponent(char.realm)}/${encodeURIComponent(char.name)}`}
              className="text-xs text-yellow-400 hover:underline shrink-0"
            >
              Ver ficha pública
            </Link>
          </div>
          <LoreBlock title="Biografía" text={char.biography} />
          <LoreBlock title="Personalidad" text={char.personality} />
          <LoreBlock title="Aspecto físico" text={char.appearance} />
        </section>
      )}

      <section className="space-y-5">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Datos de la ficha</h2>
          <p className="text-sm text-gray-400 mt-1">
            Estos campos y lo que marcas para mostrar se actualizan en la ficha sin pasar por el Eremita.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LoreInput label="Antetítulo" placeholder="El gran, Archimago..." value={prefixTitle} onChange={setPrefix} />
          <LoreInput label="Apellido" placeholder="(opcional en retail)" value={surname} onChange={setSurname} />
          <LoreInput label="Origen" placeholder="Ciudad, región..." value={origin} onChange={setOrigin} />
          <LoreInput label="Residencia" placeholder="Lugar actual..." value={residence} onChange={setResidence} />
          <LoreInput label="Edad (lore)" placeholder="Años" value={ageLore} onChange={setAge} type="number" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Mostrar en la ficha pública</p>
          <p className="text-xs text-gray-600 mb-3">La biografía se publica siempre. El resto lo eliges tú.</p>
          <div className="grid grid-cols-2 gap-2">
            {PUBLIC_FIELD_LABELS.map((field) => (
              <label key={field.key} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={publicFields[field.key]}
                  onChange={(e) => setPublicFields((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-800"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Cuestionario para el Eremita</h2>
          <p className="text-sm text-gray-400 mt-1">
            Responde con las opciones o escribe la tuya. El Eremita usará esto para redactar la ficha.
            Las historias las escribes tú más abajo.
          </p>
        </div>
        {char.bio_rejection_reason && !answersLocked && (
          <p className="text-sm text-red-300">
            El Eremita pidió cambios: {char.bio_rejection_reason}
          </p>
        )}
        {answersLocked && (
          <p className="text-sm text-amber-300">
            El cuestionario está en revisión. Cuando el Eremita escriba la ficha, aparecerá arriba.
          </p>
        )}
        {questions.length > 0 && (
          <BioQuestionnaire
            key={`${char.name}-${char.realm}-${answersLocked}`}
            questions={questions}
            answers={answers}
            locked={answersLocked}
            onChange={setAnswers}
          />
        )}
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={handleSubmitAnswers}
          disabled={sending || answersLocked || !answersComplete(questions, answers)}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm disabled:opacity-40"
        >
          {answersLocked
            ? "Enviado al Eremita"
            : sending
              ? "Enviando..."
              : published
                ? "Pedir actualización de la ficha"
                : "Enviar al Eremita"}
        </button>
      </div>

      <PublishStoryPanel name={char.name} realm={char.realm} />

      <ClaimsInbox />

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Títulos</h2>
        <CharacterTitlesSection char={char} onFavoriteTitleChange={onFavoriteTitleChange} />
      </section>

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Relaciones</h2>
        <RelationsSection char={char} />
      </section>
    </div>
  );
}

// ── Tab: Profesiones ──────────────────────────────────────────────────────

// ── Tab: Profesiones ─────────────────────────────────────────────────────────

type ProfTier = {
  name: string;
  skill_points: number;
  max_skill_points: number;
  recipe_count: number;
};

type ProfData = {
  name: string;
  id: number;
  tiers: ProfTier[];
  current_skill: number;
  current_max: number;
  current_tier_name: string;
  total_recipes: number;
};

type ProfessionsResponse = {
  primaries: ProfData[];
  secondaries: ProfData[];
  is_forever?: boolean;
  no_token?: boolean;
  token_expired?: boolean;
  error?: boolean;
};

function ProfessionCard({ prof, color, compact = false }: { prof: ProfData; color: string; compact?: boolean }) {
  const pct = prof.current_max > 0 ? Math.round((prof.current_skill / prof.current_max) * 100) : 0;
  const maxed = prof.current_skill >= prof.current_max && prof.current_max > 0;

  return (
    <div className={`bg-gray-900/70 border border-gray-800/60 rounded-xl ${compact ? "p-3" : "p-4"}`}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className={`font-semibold truncate ${compact ? "text-sm" : "text-base"}`}
             style={{ color }}>
            {prof.name}
          </p>
          {prof.current_tier_name && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{prof.current_tier_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-mono font-semibold ${compact ? "text-xs" : "text-sm"}`}
             style={{ color: maxed ? "#22c55e" : "#e5e7eb" }}>
            {prof.current_skill}<span className="text-gray-600">/{prof.current_max}</span>
          </p>
          {maxed && (
            <p className="text-xs text-green-500 font-medium">Máximo</p>
          )}
        </div>
      </div>

      {/* Barra de progreso del tier actual */}
      {prof.current_max > 0 && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: maxed ? "#22c55e" : color,
                opacity: 0.8,
              }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-600">Recetas totales</p>
          <p className="text-sm font-medium text-gray-300">{prof.total_recipes}</p>
        </div>
        {!compact && prof.tiers.length > 1 && (
          <div>
            <p className="text-xs text-gray-600">Expansiones</p>
            <p className="text-sm font-medium text-gray-300">{prof.tiers.length}</p>
          </div>
        )}
      </div>

      {/* Historial de tiers (solo en vista completa) */}
      {!compact && prof.tiers.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-800/60 space-y-1.5">
          {[...prof.tiers].reverse().slice(1).map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-600 truncate">{t.name}</p>
              <p className="text-xs text-gray-500 shrink-0 font-mono">
                {t.skill_points}/{t.max_skill_points}
                <span className="text-gray-700 ml-1">· {t.recipe_count}rec</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfessionsTab({ char, color }: { char: Character; color: string }) {
  const [data, setData]       = useState<ProfessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (char.game !== "retail") { setLoading(false); return; }
    setLoading(true);
    setData(null);
    fetch(`/api/characters/professions?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ primaries: [], secondaries: [], error: true }); setLoading(false); });
  }, [char.name, char.realm, char.game]);

  // ── Warcraft Forever ──
  if (char.game !== "retail") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <p className="text-gray-400 text-sm font-medium">Personaje de Warcraft Forever</p>
        <p className="text-gray-600 text-sm max-w-xs">
          Los personajes de Warcraft Forever no tienen datos de profesiones en Battle.net.
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2].map(i => (
          <div key={i} className="h-28 rounded-xl bg-gray-900/60 border border-gray-800/40" />
        ))}
      </div>
    );
  }

  // ── Sin Battle.net ──
  if (data?.no_token) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-gray-400 text-sm font-medium">Battle.net no conectado</p>
        <a
          href="http://localhost:8000/auth/blizzard/login"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Conectar Battle.net para ver las profesiones
        </a>
      </div>
    );
  }

  // ── Token caducado ──
  if (data?.token_expired) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-amber-400 text-sm font-medium">Token de Battle.net caducado</p>
        <a
          href="http://localhost:8000/auth/blizzard/login"
          className="text-xs text-amber-300 hover:text-amber-100 underline"
        >
          Reconectar Battle.net
        </a>
      </div>
    );
  }

  // ── Error genérico ──
  if (data?.error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 text-sm">No se pudieron cargar las profesiones.</p>
      </div>
    );
  }

  const hasPrimaries   = data.primaries.length > 0;
  const hasSecondaries = data.secondaries.length > 0;

  // ── Sin profesiones ──
  if (!hasPrimaries && !hasSecondaries) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-400 text-sm font-medium">{char.name} no tiene profesiones</p>
        <p className="text-gray-600 text-sm mt-1">Aprende una profesión en el juego para verla aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primarias */}
      {hasPrimaries && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Profesiones primarias
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.primaries.map((p, i) => (
              <ProfessionCard key={i} prof={p} color={color} />
            ))}
          </div>
        </div>
      )}

      {/* Secundarias */}
      {hasSecondaries && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Profesiones secundarias
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.secondaries.map((p, i) => (
              <ProfessionCard key={i} prof={p} color={color} compact />
            ))}
          </div>
        </div>
      )}
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
    <div className="shrink-0 flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Estado de imagen personalizada */}
      {char.custom_avatar_url && (
        <span className="text-xs text-green-500 border border-green-600/30 rounded-full px-2 py-0.5">
          Imagen propia activa
        </span>
      )}
      {char.pending_avatar_url && (
        <span className="text-xs text-amber-500 border border-amber-600/30 rounded-full px-2 py-0.5">
          Imagen pendiente
        </span>
      )}

      {/* Botón subir */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !!char.pending_avatar_url}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
        title={char.pending_avatar_url ? "Ya tienes una imagen pendiente de aprobación" : "Subir imagen propia"}
      >
        {uploading ? "Subiendo..." : char.pending_avatar_url ? "Pendiente..." : "Cambiar imagen"}
      </button>

      {/* Botón quitar */}
      {(char.custom_avatar_url || char.pending_avatar_url) && (
        <button
          onClick={handleRemove}
          className="text-xs text-gray-700 hover:text-red-400 transition-colors"
        >
          Quitar imagen
        </button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Panel de avatar en overlay mobile ────────────────────────────────────

function MobileAvatarPanel({
  char, onAvatarPatch, onClose,
}: {
  char: Character;
  onAvatarPatch: (p: CharPatch) => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    const fd = new FormData();
    fd.append("file", file); fd.append("name", char.name); fd.append("realm", char.realm);
    const res  = await fetch("/api/characters/avatar", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? data.detail ?? "Error al subir"); }
    else { onAvatarPatch({ pending_avatar_url: "pending" }); onClose(); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    const res = await fetch(
      `/api/characters/avatar?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`,
      { method: "DELETE" },
    );
    if (res.ok || res.status === 204) {
      onAvatarPatch({ avatar_url: null, custom_avatar_url: null, pending_avatar_url: null });
      onClose();
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 w-full">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !!char.pending_avatar_url}
          className="px-3 py-1.5 rounded-lg bg-gray-800 text-xs text-gray-200 border border-gray-700 disabled:opacity-40"
        >
          {uploading ? "Subiendo..." : char.pending_avatar_url ? "Pendiente" : "Cambiar imagen"}
        </button>
        {(char.custom_avatar_url || char.pending_avatar_url) && (
          <button
            onClick={handleRemove}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20"
          >
            Quitar
          </button>
        )}
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400">
          Cerrar
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

// ── Controles de avatar (desktop) ─────────────────────────────────────────

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
        {hasBnet ? "Selecciona un personaje del panel derecho" : "Conecta tu cuenta de Battle.net para ver tus personajes"}
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
