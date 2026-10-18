"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWatermarkBox } from "../components/HomeLogo";
import PathPicker from "../onboarding/PathPicker";
import PublishStoryPanel from "./PublishStoryPanel";
import FichaPreview from "./FichaPreview";
import ClaimsInbox from "./ClaimsInbox";
import Mailbox from "./Mailbox";
import ImageRequestModal from "./ImageRequestModal";
import { mergePublicFields, PUBLIC_FIELD_LABELS, type PublicFields, type WikiCharacter } from "@/lib/wiki";
import { type BioAnswers } from "@/lib/bio";
import { getEntitlements } from "@/lib/entitlements";
import { classLabel, raceLabel, factionLabel, factionColor, classColor, realmLabel, genderLabel } from "@/lib/wow";

import { publicApiUrl } from "@/lib/api";
import {
  BUCKET_LABEL, CATEGORY_LABEL, PATH_LABEL,
  type Bucket, type CapStatus, type Season, type Transaction,
} from "@/lib/points";
// ── Tipos ──────────────────────────────────────────────────────────────────

type TitleData = {
  id: string;
  name: string;
  source: string;
  slot?: "title" | "prefix";
  description?: string | null;
};

type User = PointsSummary & {
  username: string;
  guild_title: string;
  avatar_url: string | null;
  role: string;
  blizzard_battletag: string | null;
  has_blizzard: boolean;
  birthday: string | null;
};

type Character = {
  id: string;
  name: string;
  surname: string | null;
  prefix_title: string | null;
  game: string;
  realm: string;
  blizzard_character_id: number | null;
  render_url: string | null;
  face_url: string | null;
  avatar_url: string | null;
  face_display_url: string | null;
  custom_avatar_url: string | null;
  pending_avatar_url: string | null;
  custom_face_url: string | null;
  pending_face_url: string | null;
  wow_class: string | null;
  race: string | null;
  faction: string | null;
  gender: string | null;
  role_function: string | null;
  level: number | null;
  is_main: boolean;
  is_alt: boolean;
  is_verified: boolean;
  favorite_title: TitleData | null;
  favorite_prefix: TitleData | null;
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

type PointsSummary = {
  total_points: number;
  season_points: number;
  season: Season | null;
  path: string | null;
  points_cap: CapStatus | null;
};

type RelationData = {
  id: string;
  relation_type: string;
  description: string | null;
  direction: "outgoing" | "incoming";
  other: { name: string; realm: string; wow_class: string | null; owner_username: string };
  story_count?: number;
  reciprocal?: boolean;
};

type AchievementData = {
  id: string;
  name: string;
  title: string | null;
  description: string;
  icon: string;
  points_value: number;
  scope: "account" | "character";
  earned_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  TANK: "Tank", HEALER: "Healer",
  DPS_MELEE: "DPS Melé", DPS_RANGED: "DPS a distancia",
};

export const RELATION_TYPES: { value: string; label: string }[] = [
  { value: "ally", label: "Aliado/a" },
  { value: "rival", label: "Rival" },
  { value: "family", label: "Familiar" },
  { value: "mentor", label: "Mentor" },
  { value: "apprentice", label: "Aprendiz" },
  { value: "friend", label: "Amigo/a" },
  { value: "enemy", label: "Enemigo/a" },
  { value: "romantic", label: "Interés romántico" },
  { value: "companion", label: "Compañero/a de aventuras" },
];

function getRelationLabel(type: string) {
  return RELATION_TYPES.find((r) => r.value === type)?.label ?? type;
}

// ── Tipo de edición parcial de personaje ──────────────────────────────────

type CharPatch = Partial<Pick<Character,
  "surname" | "prefix_title" | "favorite_prefix" | "biography" | "personality" | "appearance" |
  "origin" | "age_lore" | "residence" |
  "avatar_url" | "face_display_url" | "custom_avatar_url" | "pending_avatar_url" |
  "custom_face_url" | "pending_face_url" |
  "bio_status" | "published_story_id" | "public_fields" |
  "bio_answers" | "bio_answers_pending" | "bio_rejection_reason" | "is_verified"
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

  useEffect(() => {
    setCharacters(initialChars);
    setSelected((prev) => {
      if (!prev) return initialChars[0] ?? null;
      return initialChars.find((c) =>
        c.name === prev.name && c.realm === prev.realm && (c.game ?? "retail") === (prev.game ?? "retail")
      ) ?? initialChars[0] ?? null;
    });
  }, [initialChars]);

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
      is_alt: !(c.name === char.name && c.realm === char.realm),
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

  function handleFavoritePrefixChange(char: Character, newPrefix: TitleData | null) {
    const patch = (c: Character) =>
      c.name === char.name && c.realm === char.realm
        ? { ...c, favorite_prefix: newPrefix, prefix_title: newPrefix?.name ?? null }
        : c;
    setCharacters((prev) => prev.map(patch));
    setSelected((prev) => prev && prev.name === char.name && prev.realm === char.realm
      ? { ...prev, favorite_prefix: newPrefix, prefix_title: newPrefix?.name ?? null }
      : prev);
  }

  function handleDetailsPatch(char: Character, p: CharPatch) {
    const patch = (c: Character) =>
      c.name === char.name && c.realm === char.realm ? { ...c, ...p } : c;
    setCharacters((prev) => prev.map(patch));
    setSelected((prev) => prev && prev.name === char.name && prev.realm === char.realm
      ? { ...prev, ...p } : prev);
  }

  const asideRef = useRef<HTMLElement>(null);
  const [asideDragX, setAsideDragX] = useState(0);
  const [asideDragging, setAsideDragging] = useState(false);
  const asideDragXRef = useRef(0);

  // Mobile: swipe right on the characters aside to dismiss
  useEffect(() => {
    if (!sidebarOpen) {
      setAsideDragX(0);
      asideDragXRef.current = 0;
      return;
    }
    const root = asideRef.current;
    if (!root) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      x0 = x;
      y0 = y;
      axis = null;
      active = true;
      asideDragXRef.current = 0;
      setAsideDragging(true);
      setAsideDragX(0);
    };

    const move = (x: number, y: number, event: Event) => {
      if (!active) return;
      const dx = x - x0;
      const dy = y - y0;
      if (!axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") {
          active = false;
          setAsideDragging(false);
          setAsideDragX(0);
          return;
        }
      }
      if (axis !== "x") return;
      event.preventDefault();
      // Only drag toward the right (dismiss direction)
      const next = Math.max(0, dx);
      asideDragXRef.current = next;
      setAsideDragX(next);
    };

    const end = () => {
      if (!active) return;
      active = false;
      setAsideDragging(false);
      const dx = asideDragXRef.current;
      const width = root.clientWidth || 288;
      if (axis === "x" && dx > width * 0.22) {
        setSidebarOpen(false);
        setAsideDragX(0);
        asideDragXRef.current = 0;
      } else {
        setAsideDragX(0);
        asideDragXRef.current = 0;
      }
      axis = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      start(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      move(e.touches[0].clientX, e.touches[0].clientY, e);
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", end);
    root.addEventListener("touchcancel", end);

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", end);
    };
  }, [sidebarOpen]);

  const mustPickPath = Boolean(
    user.season && !user.path && characters.some((c) => c.is_main)
  );
  if (mustPickPath) {
    return (
      <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-4 py-16 text-white">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-center">Elige tu itinerario</h1>
          <p className="text-sm text-gray-400 text-center mt-2 mb-6">
            Ya tienes personaje principal. Para {user.season?.name} hay que elegir itinerario
            antes de usar el perfil. Solo se puede cambiar cuando empiece la siguiente temporada.
          </p>
          <PathPicker currentPath={null} seasonName={user.season?.name ?? ""} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex text-white relative">

      {/* ── Overlay backdrop (mobile) — under navbar, over content ─ */}
      {sidebarOpen && (
        <div
          className="fixed top-12 inset-x-0 bottom-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Contenido ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col h-[calc(100vh-3rem)] overflow-hidden">
        {selected ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <CharacterDetail
              char={selected}
              transactions={transactions}
              points={user}
              onSetMain={() => handleSetMain(selected)}
              isPending={isPending}
              onFavoriteTitleChange={(t) => handleFavoriteTitleChange(selected, t)}
              onFavoritePrefixChange={(t) => handleFavoritePrefixChange(selected, t)}
              onDetailsPatch={(p) => handleDetailsPatch(selected, p)}
              onOpenCharacters={() => setSidebarOpen(true)}
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden absolute top-4 right-4 z-20 w-11 h-11 rounded-full border-2 border-white/25 bg-gray-800 overflow-hidden shadow-lg"
              aria-label="Cambiar de personaje"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-xs font-bold text-gray-400">
                  {user.username.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            <EmptyState hasBnet={user.has_blizzard} />
          </div>
        )}
      </main>

      {/* ── Sidebar — under navbar (top-12), not behind it ─────────── */}
      <aside
        ref={asideRef}
        className={`
          fixed top-12 bottom-0 right-0 z-40 w-72 bg-gray-900 border-l border-gray-800
          flex flex-col touch-pan-y
          md:sticky md:top-12 md:inset-auto md:translate-x-0
          md:w-72 md:shrink-0 md:h-[calc(100vh-3rem)] md:z-30
          ${asideDragging ? "" : "transition-transform duration-300 ease-out"}
          ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
        style={
          sidebarOpen && asideDragX > 0
            ? { transform: `translateX(${asideDragX}px)` }
            : undefined
        }
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
            <Link href={publicApiUrl("/auth/blizzard/login")} className="text-xs text-gray-500 hover:text-blue-400 underline mb-2 block">
              Conectar Battle.net
            </Link>
          )}

          {/* Aviso token caducado */}
          {bnetTokenExpired && (
            <div className="mt-2 mb-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
              <p className="text-xs text-amber-400 font-medium mb-1">Token de Battle.net caducado</p>
              <Link
                href={publicApiUrl("/auth/blizzard/login")}
                className="text-xs text-amber-300 hover:text-amber-100 underline"
              >
                Reconectar para actualizar renders
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-300 font-bold text-lg">{user.season_points.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">puntos esta temporada</span>
          </div>
        </div>

        <Mailbox>
          <BirthdaySection birthday={user.birthday} isAdmin={user.role === "admin" || user.role === "officer"} />
          <div className="flex-1 overflow-y-auto scrollbar-none p-3">
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
        </Mailbox>

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

type DetailTab = "bio" | "details" | "points" | "achievements" | "titles" | "stories" | "relations" | "professions";

function CharacterDetail({
  char, transactions, points, onSetMain, isPending, onFavoriteTitleChange, onFavoritePrefixChange, onDetailsPatch,
  onOpenCharacters,
}: {
  char: Character;
  transactions: Transaction[];
  points: PointsSummary;
  onSetMain: () => void;
  isPending: boolean;
  onFavoriteTitleChange: (t: TitleData | null) => void;
  onFavoritePrefixChange: (t: TitleData | null) => void;
  onDetailsPatch: (p: CharPatch) => void;
  onOpenCharacters?: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("bio");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const color = classColor(char.wow_class);
  const logo = useWatermarkBox();
  const factPad = logo.mobile ? 16 : Math.round(logo.left + logo.size + 12);
  const factStyle = {
    ["--fact-pad" as string]: `${factPad}px`,
  };

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "bio", label: "Bio" },
    { key: "details", label: "Datos" },
    { key: "points", label: "Puntos" },
    { key: "achievements", label: "Logros" },
    { key: "titles", label: "Títulos" },
    { key: "stories", label: "Historias" },
    { key: "relations", label: "Relaciones" },
    { key: "professions", label: "Profesiones" },
  ];
  const tabIndex = tabs.findIndex((t) => t.key === tab);
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;

  const tabBarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragXRef = useRef(0);

  // Mantener la pestaña activa visible en el scroll horizontal de la barra
  useEffect(() => {
    const root = tabBarRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);

  // Swipe horizontal entre secciones (el contenido vertical sigue scrolleando)
  useEffect(() => {
    const root = panelRef.current;
    if (!root) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      x0 = x;
      y0 = y;
      axis = null;
      active = true;
      dragXRef.current = 0;
      setDragging(true);
      setDragX(0);
    };

    const move = (x: number, y: number, event: Event) => {
      if (!active) return;
      const dx = x - x0;
      const dy = y - y0;
      if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axis !== "x") return;
      event.preventDefault();
      const atStart = tabIndexRef.current <= 0 && dx > 0;
      const atEnd = tabIndexRef.current >= tabs.length - 1 && dx < 0;
      const next = atStart || atEnd ? dx * 0.25 : dx;
      dragXRef.current = next;
      setDragX(next);
    };

    const end = () => {
      if (!active) return;
      active = false;
      setDragging(false);
      const width = root.clientWidth || 1;
      const dx = dragXRef.current;
      if (axis === "x" && Math.abs(dx) > width * 0.18) {
        const next = tabIndexRef.current + (dx < 0 ? 1 : -1);
        if (next >= 0 && next < tabs.length) {
          setTab(tabs[next].key);
        }
      }
      dragXRef.current = 0;
      setDragX(0);
      axis = null;
    };

    const onTouchStart = (e: TouchEvent) => start(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY, e);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", end);
    root.addEventListener("touchcancel", end);
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", end);
    };
  }, [tabs.length]);

  const hasGoodRender = !!(
    char.avatar_url
    && (!char.render_url?.endsWith("-avatar.jpg") || !!char.custom_avatar_url)
  );
  const displayName = `${char.name}${char.surname ? ` ${char.surname}` : ""}`;
  const shownTitle = char.favorite_title?.name ?? null;
  const shownPrefix = char.favorite_prefix?.name ?? char.prefix_title;
  const faceSrc = char.face_display_url || char.face_url || null;

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

      <header
        className="relative z-10 shrink-0 px-4 pt-5 pb-3 sm:pr-8 sm:pl-[var(--fact-pad)] sm:pt-[max(2rem,calc(140px+3.75rem))] lg:pt-[max(2rem,calc(220px+7rem))]"
        style={factStyle}
      >
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 flex-1 grid grid-rows-[1.4rem_2.35rem_1.85rem] sm:grid-rows-[1.7rem_2.7rem_2.1rem] text-[#f3eee4]">
            <span className="flex items-end min-w-0 font-quest text-sm sm:text-[1.15rem] font-semibold leading-none tracking-wide opacity-90">
              {shownPrefix ? (
                <span className="truncate">{shownPrefix}</span>
              ) : null}
            </span>
            <span className="flex items-end min-w-0 font-quest-display text-[1.65rem] sm:text-[2rem] font-bold leading-none tracking-wide">
              <span className="truncate">{displayName}</span>
            </span>
            <span className="flex items-end min-w-0 font-quest text-base sm:text-[1.2rem] font-semibold leading-none tracking-wide text-[#e4ddd0]">
              {shownTitle ? <span className="truncate">{shownTitle}</span> : null}
            </span>
          </h1>

          {onOpenCharacters ? (
            <button
              type="button"
              onClick={onOpenCharacters}
              className="md:hidden shrink-0 w-12 h-12 rounded-full border-2 border-white/25 overflow-hidden bg-gray-800 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              aria-label="Cambiar de personaje"
            >
              {faceSrc ? (
                <img src={faceSrc} alt="" className="w-full h-full object-cover object-top" />
              ) : (
                <span className="flex h-full items-center justify-center text-xs font-bold text-gray-400">
                  {char.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          ) : null}
        </div>
      </header>

      {/* Barra de pestañas fija (solo scroll horizontal) */}
      <div
        className="relative z-20 shrink-0 px-4 sm:pr-8 sm:pl-[var(--fact-pad)] bg-transparent"
        style={factStyle}
      >
        <div
          ref={tabBarRef}
          className="flex gap-1 border-b border-gray-800 overflow-x-auto overscroll-x-contain scrollbar-none touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              data-tab={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors -mb-px border-b-2 whitespace-nowrap shrink-0 ${tab === t.key
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

      {/* Paneles: swipe lateral entre secciones; scroll vertical dentro de cada una */}
      <div
        ref={panelRef}
        className="relative z-10 flex-1 min-h-0 overflow-hidden"
        style={factStyle}
      >
        <div
          className={`flex h-full w-full will-change-transform ${dragging ? "" : "transition-transform duration-300 ease-out"
            }`}
          style={{
            transform: `translateX(calc(${-tabIndex * 100}% + ${dragX}px))`,
          }}
        >
          {tabs.map((t) => {
            const active = t.key === tab;
            const panelPad = "px-4 sm:pr-8 sm:pl-[var(--fact-pad)]";
            return (
              <div
                key={t.key}
                className={`w-full h-full shrink-0 ${panelPad} ${t.key === "bio"
                  ? "overflow-hidden flex flex-col pt-3 pb-10 sm:pt-4 sm:pb-14"
                  : "overflow-y-auto overscroll-y-contain scrollbar-none py-3 sm:py-4"
                  }`}
                aria-hidden={!active}
              >
                {active || Math.abs(tabs.findIndex((x) => x.key === t.key) - tabIndex) <= 1 ? (
                  <>
                    {t.key === "bio" && (
                      <BioTab char={char} onDetailsPatch={onDetailsPatch} />
                    )}
                    {t.key === "details" && (
                      <DetailsTab
                        char={char}
                        onDetailsPatch={onDetailsPatch}
                        onSetMain={onSetMain}
                        isPending={isPending}
                      />
                    )}
                    {t.key === "points" && (
                      <PointsTab transactions={transactions} points={points} />
                    )}
                    {t.key === "achievements" && <AchievementsTab char={char} />}
                    {t.key === "titles" && (
                      <TitlesTab
                        char={char}
                        onFavoriteTitleChange={onFavoriteTitleChange}
                        onFavoritePrefixChange={onFavoritePrefixChange}
                      />
                    )}
                    {t.key === "stories" && <StoriesTab char={char} />}
                    {t.key === "relations" && <RelationsTab char={char} />}
                    {t.key === "professions" && (
                      <ProfessionsTab char={char} color={color} />
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function relationDegree(count: number) {
  if (count >= 3) return "Estrecha";
  if (count >= 1) return "Cercana";
  return "Ocasional";
}

// ── Tab: Logros ───────────────────────────────────────────────────────────

function AchievementsTab({ char }: { char: Character }) {
  const [items, setItems] = useState<AchievementData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    fetch(`/api/characters/achievements?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [char.name, char.realm]);

  if (items === null) {
    return <p className="text-gray-600 text-sm">Cargando logros...</p>;
  }

  const account = items.filter((a) => a.scope === "account");
  const personal = items.filter((a) => a.scope === "character");

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-400">
        Los de cuenta se ven en todos tus personajes. Los de personaje solo en este.
      </p>
      <AchievementGroup title="De cuenta" items={account} empty="Aún no hay logros de cuenta." />
      <AchievementGroup title="De este personaje" items={personal} empty="Este personaje aún no tiene logros propios." />
    </div>
  );
}

function AchievementGroup({
  title, items, empty,
}: {
  title: string;
  items: AchievementData[];
  empty: string;
}) {
  return (
    <section>
      <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-lg bg-gray-900 border border-gray-800/50">
              {item.icon.startsWith("http") || item.icon.startsWith("/") ? (
                <img src={item.icon} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-gray-800 border border-gray-700 shrink-0 flex items-center justify-center text-sm text-yellow-400">
                  {item.icon.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-100">{item.title || item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {item.points_value} pts · {new Date(item.earned_at).toLocaleDateString("es-ES")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Tab: Puntos ───────────────────────────────────────────────────────────

function PointsTab({ transactions, points }: { transactions: Transaction[]; points: PointsSummary }) {
  const { season, path, points_cap: cap } = points;
  const buckets = (cap ? (Object.keys(cap) as Bucket[]) : []).filter((b) => cap![b].accrued > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-gray-500 truncate">
            {season ? season.name : "Temporada"}
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{points.season_points.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-gray-500">Total histórico</p>
          <p className="text-2xl font-bold text-gray-200 mt-1">{points.total_points.toLocaleString()}</p>
        </div>
      </div>

      {season && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">Itinerario</h2>
            {path ? (
              <span className="text-sm font-semibold text-gray-200">{PATH_LABEL[path] ?? path}</span>
            ) : (
              <Link href="/onboarding" className="text-sm text-blue-400 hover:text-blue-300 underline">
                Elegir itinerario
              </Link>
            )}
          </div>
          {!path && (
            <p className="text-xs text-gray-500">
              Cuando marques un personaje principal, tendrás que elegir itinerario para que cuenten los puntos.
            </p>
          )}
          {buckets.map((b) => {
            const { accrued, used, available } = cap![b];
            return (
              <div key={b}>
                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="text-gray-400">{BUCKET_LABEL[b]}</span>
                  <span className="text-gray-300">
                    Te quedan <span className="font-bold text-yellow-400">{available.toLocaleString()}</span> puntos
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-yellow-500/80"
                    style={{ width: `${Math.min(100, (used / accrued) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">
                  {used.toLocaleString()} de {accrued.toLocaleString()} acumulados esta temporada
                </p>
              </div>
            );
          })}
          {buckets.length > 0 && (
            <p className="text-[11px] text-gray-600">
              Cada semana (miércoles, reset de WoW) suma margen nuevo y lo que no uses se acumula.
              Lo que pase del margen no cuenta.
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Historial</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin actividad registrada aún.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t, i) => (
              <TransactionRow key={`${t.occurred_at}-${i}`} t={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TransactionRow({ t }: { t: Transaction }) {
  const partial = t.weekly_capped && t.counted_amount < t.amount;
  const counted = t.weekly_capped ? t.counted_amount : t.amount;
  const note = !t.weekly_capped
    ? "Ajuste de admin"
    : counted === 0
    ? "No cuenta: sin margen de " + BUCKET_LABEL[t.bucket].toLowerCase()
    : partial
    ? `Cuenta ${counted} de ${t.amount}: se agotó el margen`
    : null;
  const split = t.reason.indexOf(" — ");
  const title = split === -1 ? t.reason : t.reason.slice(0, split);
  const detail = split === -1 ? null : t.reason.slice(split + 3);

  return (
    <li className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900 border border-gray-800/50 ${counted === 0 && t.amount > 0 ? "opacity-60" : ""}`}>
      <span
        className={`text-sm font-bold w-14 text-right shrink-0 ${
          counted > 0 ? "text-green-400" : counted < 0 ? "text-red-400" : "text-gray-500 line-through"
        }`}
      >
        {counted === 0 ? `+${t.amount}` : `${counted > 0 ? "+" : ""}${counted}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200">{title}</p>
        {detail && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
        <p className="text-xs text-gray-500">
          {t.event_category ? CATEGORY_LABEL[t.event_category] ?? t.event_category : null}
          {note && <span className={t.weekly_capped ? "text-amber-400/80" : ""}>{t.event_category ? " · " : ""}{note}</span>}
        </p>
      </div>
      <span className="text-xs text-gray-600 shrink-0">
        {new Date(t.occurred_at).toLocaleDateString("es-ES")}
      </span>
    </li>
  );
}

// ── Tab: Bio ──────────────────────────────────────────────────────────────

function buildFichaPreview(char: Character, biography: string): WikiCharacter {
  const fields = mergePublicFields(char.public_fields);
  return {
    id: char.id,
    name: char.name,
    realm: char.realm,
    display_name: `${char.name}${char.surname ? ` ${char.surname}` : ""}`.trim(),
    title: fields.title ? (char.favorite_title?.name ?? null) : null,
    prefix_title: fields.prefix ? (char.favorite_prefix?.name ?? char.prefix_title) : null,
    cover_url: char.avatar_url,
    biography: biography.trim() || null,
    personality: fields.personality ? (char.personality ?? null) : null,
    appearance: fields.appearance ? (char.appearance ?? null) : null,
    origin: fields.origin ? char.origin : null,
    age_lore: fields.age ? char.age_lore : null,
    residence: fields.residence ? char.residence : null,
    wow_class: fields.class ? char.wow_class : null,
    race: fields.race ? char.race : null,
    faction: fields.faction ? char.faction : null,
    gender: char.gender,
    author_username: "",
    related: [],
    stories: [],
  };
}

function BioTab({
  char, onDetailsPatch,
}: {
  char: Character;
  onDetailsPatch: (p: CharPatch) => void;
}) {
  const answersLocked = char.bio_answers_pending;
  const [biography, setBiography] = useState(char.biography ?? "");
  const [savingSheet, setSavingSheet] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const scrollerRef = useRef<HTMLTextAreaElement>(null);

  const sheetDirty = biography !== (char.biography ?? "");

  function updateScrollHint() {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollMore(false);
      return;
    }
    setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 16);
  }

  useEffect(() => {
    setError(null);
    setBiography(char.biography ?? "");
  }, [char.name, char.realm, char.biography]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollHint();
    const ro = new ResizeObserver(updateScrollHint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [biography, answersLocked]);

  async function handleSaveSheet() {
    setSavingSheet(true);
    setError(null);
    try {
      const res = await fetch("/api/characters/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: char.name,
          realm: char.realm,
          biography,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(typeof d.detail === "string" ? d.detail : "Error al guardar la ficha");
      } else {
        const updated = await res.json();
        onDetailsPatch({
          biography: updated.biography ?? null,
          bio_status: updated.bio_status,
        });
      }
    } finally {
      setSavingSheet(false);
    }
  }

  async function handlePublish() {
    if (biography.trim().length < 40) {
      setError("La biografía es demasiado corta para publicarla");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const save = await fetch("/api/characters/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: char.name,
          realm: char.realm,
          biography,
        }),
      });
      if (!save.ok) {
        const d = await save.json();
        setError(typeof d.detail === "string" ? d.detail : "Error al guardar la ficha");
        return;
      }
      const saved = await save.json();
      onDetailsPatch({
        biography: saved.biography ?? null,
        bio_status: saved.bio_status,
      });
      const res = await fetch("/api/characters/bio/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "No se pudo publicar");
      } else {
        onDetailsPatch({
          bio_answers_pending: data.bio_answers_pending,
          bio_status: data.bio_status,
          bio_rejection_reason: data.bio_rejection_reason,
          biography: data.biography ?? biography,
        });
      }
    } finally {
      setSending(false);
    }
  }

  const btn =
    "px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm disabled:opacity-50";
  const btnQuiet =
    "px-4 py-2 rounded-lg border border-gray-700 bg-transparent hover:bg-gray-800/80 text-gray-200 font-semibold text-sm disabled:opacity-50";

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 max-w-2xl">
      <p className="shrink-0 text-sm text-gray-400">
        Escribe aquí una breve biografía del personaje. La vista previa muestra cómo se verá en el pergamino cuando el Eremita la publique.
      </p>
      <div className="relative min-h-0 flex-1">
        <label className="text-xs text-gray-500 block mb-1">Biografía</label>
        <textarea
          ref={scrollerRef}
          value={biography}
          onChange={(e) => {
            setBiography(e.target.value);
            requestAnimationFrame(updateScrollHint);
          }}
          onScroll={updateScrollHint}
          placeholder="Cuenta quién es este personaje: de dónde viene, qué lo mueve, qué ha vivido…"
          disabled={answersLocked}
          aria-label="Biografía"
          className="bio-field h-[calc(100%-1.25rem)] w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 pb-10 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-none leading-relaxed disabled:opacity-70"
        />
        {canScrollMore && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 rounded-b-lg bg-gradient-to-t from-gray-900 to-transparent"
              aria-hidden
            />
            <button
              type="button"
              aria-label="Bajar para seguir leyendo"
              onClick={() =>
                scrollerRef.current?.scrollBy({
                  top: Math.round((scrollerRef.current.clientHeight || 240) * 0.7),
                  behavior: "smooth",
                })
              }
              className="bio-scroll-hint absolute bottom-3 left-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-gray-950/80 text-[#e4ddd0] shadow-lg backdrop-blur-sm hover:bg-gray-900 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>
      {sheetDirty && !answersLocked && (
        <p className="shrink-0 text-xs text-gray-500">Hay cambios sin guardar.</p>
      )}
      {error && <p className="shrink-0 text-red-400 text-sm">{error}</p>}
      {answersLocked && (
        <p className="shrink-0 text-sm text-amber-300">
          El Eremita está revisando la ficha. Cuando la publique, el texto quedará en el pergamino.
        </p>
      )}
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPreviewOpen(true)} className={btnQuiet}>
          Vista previa
        </button>
        <button
          type="button"
          onClick={handleSaveSheet}
          disabled={savingSheet || answersLocked || !sheetDirty}
          className={btn}
        >
          {savingSheet ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={sending || answersLocked || biography.trim().length < 40}
          className={btn}
        >
          {sending ? "Publicando..." : "Publicar ficha"}
        </button>
      </div>
      {previewOpen && (
        <FichaPreview
          char={buildFichaPreview(char, biography)}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function DetailsTab({
  char, onDetailsPatch, onSetMain, isPending,
}: {
  char: Character;
  onDetailsPatch: (p: CharPatch) => void;
  onSetMain: () => void;
  isPending: boolean;
}) {
  const [surname, setSurname] = useState(char.surname ?? "");
  const [origin, setOrigin] = useState(char.origin ?? "");
  const [ageLore, setAge] = useState(char.age_lore ? String(char.age_lore) : "");
  const [residence, setResidence] = useState(char.residence ?? "");
  const [publicFields, setPublicFields] = useState<PublicFields>(mergePublicFields(char.public_fields));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSurname(char.surname ?? "");
    setOrigin(char.origin ?? "");
    setAge(char.age_lore ? String(char.age_lore) : "");
    setResidence(char.residence ?? "");
    setPublicFields(mergePublicFields(char.public_fields));
    setError(null);
  }, [char.name, char.realm]);

  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  async function handleVerify() {
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await fetch("/api/characters/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyMessage(data.detail ?? data.error ?? "No se pudo verificar el personaje.");
        return;
      }
      onDetailsPatch({ is_verified: true });
    } catch {
      setVerifyMessage("No se pudo contactar con el servidor.");
    } finally {
      setVerifying(false);
    }
  }

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
          surname: surname || null,
          origin: origin || null,
          age_lore: ageLore ? parseInt(ageLore) : null,
          residence: residence || null,
          public_fields: publicFields,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(typeof d.detail === "string" ? d.detail : "Error al guardar");
      } else {
        onDetailsPatch({
          surname: surname || null,
          origin: origin || null,
          age_lore: ageLore ? parseInt(ageLore) : null,
          residence: residence || null,
          public_fields: publicFields,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const identity = [
    { label: "Raza", value: raceLabel(char.race, char.gender) },
    { label: "Clase", value: classLabel(char.wow_class, char.gender) },
    { label: "Facción", value: factionLabel(char.faction), color: factionColor(char.faction) },
    { label: "Género", value: genderLabel(char.gender) },
    { label: "Reino", value: char.game !== "forever" ? realmLabel(char.realm) : char.realm },
  ].filter((d) => d.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
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
            type="button"
            onClick={onSetMain}
            disabled={isPending}
            className="px-2.5 py-0.5 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs border border-gray-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Establecer como main"}
          </button>
        )}
        {char.game === "retail" && !char.is_verified && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="px-2.5 py-0.5 rounded-full bg-gray-800 hover:bg-gray-700 text-blue-400 text-xs border border-gray-700 transition-colors disabled:opacity-50"
          >
            {verifying ? "Verificando..." : "Verificar con Battle.net"}
          </button>
        )}
      </div>
      {verifyMessage && <p className="text-sm text-gray-400">{verifyMessage}</p>}

      <div className="space-y-3">
        <CharacterImageSlot
          kind="face"
          char={char}
          onPatch={(p) => onDetailsPatch(p)}
        />
        <CharacterImageSlot
          kind="full"
          char={char}
          onPatch={(p) => onDetailsPatch(p)}
        />
      </div>
      {identity.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Identidad de juego</p>
          <div className="grid grid-cols-2 gap-2">
            {identity.map((d) => (
              <div key={d.label} className="bg-gray-900/70 rounded-lg px-3 py-2 border border-gray-800/50">
                <p className="text-xs text-gray-600 mb-0.5">{d.label}</p>
                <p className="text-sm font-medium truncate" style={"color" in d && d.color ? { color: d.color } : { color: "#e5e7eb" }}>
                  {d.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-sm text-gray-400">
        Datos de la ficha. Se actualizan sin pasar por el Eremita.
      </p>
      <div className="grid grid-cols-2 gap-3">
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
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-semibold text-sm disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar datos"}
      </button>
    </div>
  );
}

function TitlesTab({
  char, onFavoriteTitleChange, onFavoritePrefixChange,
}: {
  char: Character;
  onFavoriteTitleChange: (t: TitleData | null) => void;
  onFavoritePrefixChange: (t: TitleData | null) => void;
}) {
  const { maxDisplayedTitles } = getEntitlements();
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const canSync = char.game === "retail" && char.is_verified;

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/characters/sync-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncMessage(data.detail ?? data.error ?? "No se pudo sincronizar con el juego.");
        return;
      }
      if (data.granted > 0) {
        setSyncMessage(
          data.granted === 1 ? "Se ha añadido 1 título." : `Se han añadido ${data.granted} títulos.`
        );
        setRefreshKey((k) => k + 1);
      } else {
        setSyncMessage("No hay títulos nuevos del juego para añadir.");
      }
    } catch {
      setSyncMessage("No se pudo contactar con el servidor.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      {canSync && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-colors disabled:opacity-50"
          >
            {syncing ? "Sincronizando..." : "Sincronizar con el juego"}
          </button>
          {syncMessage && <p className="text-sm text-gray-400">{syncMessage}</p>}
        </div>
      )}
      {char.game === "retail" && !char.is_verified && (
        <p className="text-sm text-gray-400">
          Verifica este personaje en la pestaña Datos para sincronizar sus títulos con el juego.
        </p>
      )}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Antetítulos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Van delante del nombre. Se desbloquean con logros, igual que los títulos.
          </p>
        </div>
        <CharacterTitlesSection
          char={char}
          slot="prefix"
          favorite={char.favorite_prefix ?? null}
          emptyLabel="Este personaje aún no tiene antetítulos."
          onFavoriteChange={onFavoritePrefixChange}
          refreshKey={refreshKey}
        />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-xs text-gray-500 uppercase tracking-wider">Títulos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Van debajo del nombre en el perfil y en la ficha.
            {maxDisplayedTitles === 1
              ? " De momento solo uno."
              : ` Puedes mostrar hasta ${maxDisplayedTitles}.`}
          </p>
        </div>
        <CharacterTitlesSection
          char={char}
          slot="title"
          favorite={char.favorite_title}
          emptyLabel="Este personaje aún no tiene títulos."
          onFavoriteChange={onFavoriteTitleChange}
          refreshKey={refreshKey}
        />
      </section>
    </div>
  );
}

function StoriesTab({ char }: { char: Character }) {
  return <PublishStoryPanel name={char.name} realm={char.realm} />;
}

function RelationsTab({ char }: { char: Character }) {
  return (
    <div className="space-y-8">
      <ClaimsInbox />
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

type CompletedCraft = {
  item_name: string;
  quantity: number;
  profession_name: string;
  status: string;
};

type ProfessionsResponse = {
  primaries: ProfData[];
  secondaries: ProfData[];
  completed_orders?: CompletedCraft[];
  is_forever?: boolean;
  no_token?: boolean;
  token_expired?: boolean;
  error?: boolean;
};

function professionLevel(prof: ProfData) {
  if (!prof.current_max) return `Nivel ${prof.current_skill}`;
  return `Nivel ${prof.current_skill}/${prof.current_max}`;
}

function ProfessionsTab({ char, color }: { char: Character; color: string }) {
  const [data, setData] = useState<ProfessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/characters/professions?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ primaries: [], secondaries: [], error: true }); setLoading(false); });
  }, [char.name, char.realm, char.game]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2].map(i => (
          <div key={i} className="h-12 rounded-xl bg-gray-900/60 border border-gray-800/40" />
        ))}
      </div>
    );
  }

  const professions = [...(data?.primaries ?? []), ...(data?.secondaries ?? [])];
  const orders = data?.completed_orders ?? [];
  const empty = professions.length === 0 && orders.length === 0;

  if (data?.is_forever && empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <p className="text-gray-400 text-sm font-medium">Personaje de Warcraft Forever</p>
        <p className="text-gray-600 text-sm max-w-xs">
          Los personajes de Warcraft Forever no tienen datos de profesiones en Battle.net.
        </p>
      </div>
    );
  }

  if (data?.no_token && empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-gray-400 text-sm font-medium">Battle.net no conectado</p>
        <a
          href={publicApiUrl("/auth/blizzard/login")}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Conectar Battle.net para ver las profesiones
        </a>
      </div>
    );
  }

  if (data?.token_expired && empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <p className="text-amber-400 text-sm font-medium">Token de Battle.net caducado</p>
        <a
          href={publicApiUrl("/auth/blizzard/login")}
          className="text-xs text-amber-300 hover:text-amber-100 underline"
        >
          Reconectar Battle.net
        </a>
      </div>
    );
  }

  if ((data?.error || !data) && empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 text-sm">No se pudieron cargar las profesiones.</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-400 text-sm font-medium">{char.name} no tiene profesiones</p>
        <p className="text-gray-600 text-sm mt-1">Aprende una profesión en el juego para verla aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(data?.no_token || data?.token_expired) && (
        <a
          href={publicApiUrl("/auth/blizzard/login")}
          className="inline-block text-xs text-amber-300 hover:text-amber-100 underline"
        >
          Reconecta Battle.net para actualizar los niveles
        </a>
      )}
      <ProfessionsBody professions={professions} orders={orders} color={color} />
    </div>
  );
}

function ProfessionsBody({
  professions,
  orders,
  color,
}: {
  professions: ProfData[];
  orders: CompletedCraft[];
  color: string;
}) {
  return (
    <div className="space-y-6">
      {professions.length > 0 && (
        <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
          {professions.map((prof) => (
            <li key={`${prof.id}-${prof.name}`} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <p className="text-sm font-medium truncate" style={{ color }}>{prof.name}</p>
              <p className="text-xs text-gray-400 shrink-0">{professionLevel(prof)}</p>
            </li>
          ))}
        </ul>
      )}
      {orders.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Pedidos completados
          </p>
          <ul className="space-y-2">
            {orders.map((order, index) => (
              <li key={`${order.item_name}-${index}`} className="text-sm text-gray-300">
                {order.quantity}× {order.item_name}
                <span className="text-gray-500"> · {order.profession_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Sección títulos ───────────────────────────────────────────────────────

function CharacterTitlesSection({
  char, slot, favorite, emptyLabel, onFavoriteChange, refreshKey = 0,
}: {
  char: Character;
  slot: "title" | "prefix";
  favorite: TitleData | null;
  emptyLabel: string;
  onFavoriteChange: (t: TitleData | null) => void;
  refreshKey?: number;
}) {
  const [titles, setTitles] = useState<TitleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const endpoint = slot === "prefix"
    ? "/api/characters/set-favorite-prefix"
    : "/api/characters/set-favorite-title";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/characters/titles?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d) ? d as TitleData[] : [];
        setTitles(list.filter((t) => (t.slot ?? "title") === slot));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [char.name, char.realm, slot, refreshKey]);

  async function handleSetFavorite(title: TitleData | null) {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm, title_id: title?.id ?? null }),
      });
      if (res.ok) onFavoriteChange(title);
    } finally { setSaving(false); }
  }

  if (loading) return <p className="text-gray-600 text-sm">Cargando...</p>;
  if (titles.length === 0) return (
    <p className="text-gray-600 text-sm">{emptyLabel}</p>
  );

  return (
    <ul className="space-y-2">
      {titles.map((title) => {
        const isFav = favorite?.id === title.id;
        return (
          <li key={title.id} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors ${isFav ? "border-yellow-500/40 bg-yellow-500/5" : "border-gray-800 bg-gray-900/50"}`}>
            <div>
              <p className={`text-sm font-medium ${isFav ? "text-yellow-400" : "text-gray-200"}`}>{title.name}</p>
              {title.description && <p className="text-xs text-gray-500 mt-0.5">{title.description}</p>}
            </div>
            <button
              onClick={() => handleSetFavorite(isFav ? null : title)}
              disabled={saving}
              className={`ml-4 text-xs px-3 py-1 rounded-lg border shrink-0 transition-colors disabled:opacity-50 ${isFav ? "border-yellow-500/40 text-yellow-400 hover:text-red-400 hover:border-red-500/40"
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
  const color = classColor(rel.other.wow_class);
  const count = rel.story_count ?? 0;
  return (
    <div className="px-4 py-3 rounded-lg bg-gray-900/70 border border-gray-800/50 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color }}>{rel.other.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{getRelationLabel(rel.relation_type)}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{relationDegree(count)}</span>
          {rel.reciprocal && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Recíproca</span>
          )}
          <span className="text-xs text-gray-600">({rel.other.owner_username})</span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5 italic">
          {rel.direction === "outgoing"
            ? `Consideras a ${rel.other.name} tu ${getRelationLabel(rel.relation_type).toLowerCase()}`
            : `${rel.other.name} te considera su ${getRelationLabel(rel.relation_type).toLowerCase()}`}
          {count > 0 ? ` · ${count} historia${count === 1 ? "" : "s"} en común` : ""}
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; realm: string; wow_class: string | null; owner_username: string }[]>([]);
  const [target, setTarget] = useState<{ name: string; realm: string; owner_username: string } | null>(null);
  const [relType, setRelType] = useState("ally");
  const [desc, setDesc] = useState("");
  const [searching, setSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
                    <span className="text-sm font-medium" style={{ color: classColor(r.wow_class) }}>{r.name}</span>
                    <span className="text-xs text-gray-500">{realmLabel(r.realm) ?? r.realm}</span>
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

// ── Imágenes del personaje (cara / completa) ──────────────────────────────

function CharacterImageSlot({
  kind,
  char,
  onPatch,
}: {
  kind: "face" | "full";
  char: Character;
  onPatch: (p: CharPatch) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFace = kind === "face";
  const endpoint = isFace ? "/api/characters/face" : "/api/characters/avatar";
  const pending = isFace ? char.pending_face_url : char.pending_avatar_url;
  const custom = isFace ? char.custom_face_url : char.custom_avatar_url;
  const preview = isFace
    ? (char.face_display_url ?? char.face_url)
    : (char.avatar_url ?? char.render_url);
  const initials = char.name.slice(0, 2).toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", char.name);
    fd.append("realm", char.realm);
    const res = await fetch(endpoint, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? data.detail ?? "Error al subir");
    } else if (isFace) {
      onPatch({ pending_face_url: "pending" });
    } else {
      onPatch({ pending_avatar_url: "pending" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRemove() {
    const res = await fetch(
      `${endpoint}?name=${encodeURIComponent(char.name)}&realm=${encodeURIComponent(char.realm)}`,
      { method: "DELETE" }
    );
    if (res.ok || res.status === 204) {
      if (isFace) {
        const face =
          char.face_url
          ?? (char.render_url?.endsWith("-avatar.jpg") ? char.render_url : null);
        onPatch({
          custom_face_url: null,
          pending_face_url: null,
          face_display_url: face,
        });
      } else {
        onPatch({
          custom_avatar_url: null,
          pending_avatar_url: null,
          avatar_url: char.render_url,
        });
      }
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/50 px-4 py-3 flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <img
          src={preview}
          alt=""
          className={`shrink-0 border border-white/15 object-cover ${isFace
            ? "w-16 h-16 rounded-full"
            : "w-14 h-[4.5rem] rounded-lg object-top"
            }`}
        />
      ) : (
        <div
          className={`shrink-0 bg-gray-800 border border-white/10 flex items-center justify-center text-sm font-bold text-gray-400 ${isFace ? "w-16 h-16 rounded-full" : "w-14 h-[4.5rem] rounded-lg"
            }`}
        >
          {initials}
        </div>
      )}

      <div className="flex flex-col items-start gap-1 min-w-0">
        <p className="text-xs font-medium text-gray-300">
          {isFace ? "Foto de cara" : "Imagen completa"}
        </p>
        <p className="text-[11px] text-gray-500 leading-snug">
          {isFace
            ? "Se muestra en el ranking. Battle.net por defecto, o sube una propia."
            : "Se muestra en la ficha, el perfil y el carrusel."}
        </p>
        {custom && (
          <span className="text-[11px] text-green-500 border border-green-600/30 rounded-full px-2 py-0.5">
            Imagen propia activa
          </span>
        )}
        {pending && (
          <span className="text-[11px] text-amber-500 border border-amber-600/30 rounded-full px-2 py-0.5">
            Pendiente de aprobación
          </span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !!pending}
            className="text-xs text-gray-300 hover:text-white transition-colors disabled:opacity-40"
          >
            {uploading ? "Subiendo..." : pending ? "Pendiente..." : preview ? "Cambiar" : "Subir foto"}
          </button>
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="text-xs text-yellow-500/90 hover:text-yellow-400 transition-colors"
          >
            Solicitar imagen
          </button>
          {(custom || pending) && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
        {requestSent && (
          <p className="text-[11px] text-green-500/90">Solicitud de imagen enviada.</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <ImageRequestModal
        open={requestOpen}
        kind={kind}
        char={char}
        onClose={() => setRequestOpen(false)}
        onSubmitted={() => setRequestSent(true)}
      />
    </div>
  );
}

// ── Lista de personajes agrupada por juego ────────────────────────────────

const GAME_LABEL: Record<string, string> = {
  retail: "World of Warcraft",
  forever: "Warcraft Forever",
};

const GAME_ACCENT: Record<string, string> = {
  retail: "#3b82f6",   // blue-500
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
                const color = classColor(char.wow_class);
                const isActive = selected?.name === char.name && selected?.realm === char.realm && (selected?.game ?? "retail") === game;
                return (
                  <li key={`${char.name}-${char.realm}-${game}`}>
                    <button
                      onClick={() => onSelect(char)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${isActive ? "bg-gray-700 ring-1 ring-gray-600" : "hover:bg-gray-800"
                        }`}
                    >
                      {(char.face_display_url || char.face_url) ? (
                        <img
                          src={(char.face_display_url || char.face_url)!}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border border-white/10"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {char.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color }}>
                          {char.name}
                          {char.surname && <span className="font-normal opacity-70"> {char.surname}</span>}
                          {char.is_main && <span className="ml-1 text-xs text-yellow-400 font-normal opacity-80">(main)</span>}
                        </p>
                        <p className="text-xs truncate mt-0.5">
                          {char.favorite_title
                            ? <span className="text-yellow-500/80">{char.favorite_title.name}</span>
                            : <span className="text-gray-500">{char.game !== "forever" ? realmLabel(char.realm) : char.realm}</span>}
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

function EmptyState({ hasBnet }: { hasBnet: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <p className="text-gray-400 mb-4">
        {hasBnet ? "Selecciona un personaje del panel derecho" : "Conecta tu cuenta de Battle.net para ver tus personajes"}
      </p>
      {!hasBnet && (
        <Link href={publicApiUrl("/auth/blizzard/login")} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium">
          Conectar Battle.net
        </Link>
      )}
    </div>
  );
}

// ── Sección cumpleaños ────────────────────────────────────────────────────

function BirthdaySection({ birthday, isAdmin }: { birthday: string | null; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(birthday);
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
