"use client";

import { useEffect, useRef, useState } from "react";

export type RankCharacter = {
  name: string;
  realm: string;
  wow_class: string | null;
  is_main: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  level: number | null;
};

export type RankEntry = {
  position: number;
  username: string;
  discord_id: string;
  /** Puntos por los que se ordena: los de la temporada en curso (o el total si no hay temporada). */
  points: number;
  total_points: number;
  avatar_url: string | null;
  guild_title: string;
  characters: RankCharacter[];
};

export type RankGroup = {
  position: number;
  points: number;
  entries: RankEntry[];
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      {dir === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export default function RankingBoard({ groups }: { groups: RankGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol className="space-y-3 sm:space-y-4">
      {groups.map((group) => (
        <li
          key={`${group.position}-${group.points}`}
          className="flex items-center gap-1.5 sm:gap-3"
        >
          <span className="shrink-0 w-[3.25rem] sm:w-[4rem] flex items-center justify-start font-quest-display font-bold text-yellow-400/90 leading-none text-[clamp(1.85rem,8vw,2.75rem)] tabular-nums pl-1 sm:pl-2">
            {group.position}º
          </span>
          <RankRow
            entries={group.entries}
            openId={openId}
            onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
          />
        </li>
      ))}
    </ol>
  );
}

function RankRow({
  entries,
  openId,
  onToggle,
}: {
  entries: RankEntry[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const tied = entries.length > 1;

  function updateArrows() {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el || !tied) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [tied, entries.length]);

  function scroll(dir: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.72, 420), behavior: "smooth" });
  }

  return (
    <div className="relative flex-1 min-w-0">
      {tied && canPrev && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Anterior"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full border border-white/15 bg-[#0c1220]/90 text-yellow-400 hover:border-yellow-400/40"
        >
          <Chevron dir="left" />
        </button>
      )}
      <ul
        ref={scroller}
        className={
          tied
            ? "flex w-full gap-2 sm:gap-3 overflow-x-auto scrollbar-none overscroll-x-contain snap-x snap-mandatory md:snap-proximity scroll-px-1"
            : "flex w-full"
        }
      >
        {entries.map((entry) => {
          const open = openId === entry.discord_id;
          return (
            <li
              key={entry.discord_id}
              className={
                tied
                  ? "w-[min(18.5rem,calc(100%-1.75rem))] shrink-0 snap-start md:flex-1 md:min-w-[22rem] md:w-auto"
                  : "min-w-0 w-full"
              }
            >
              <RankCard entry={entry} open={open} onToggle={() => onToggle(entry.discord_id)} />
            </li>
          );
        })}
      </ul>
      {tied && canNext && (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Siguiente"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full border border-white/15 bg-[#0c1220]/90 text-yellow-400 hover:border-yellow-400/40"
        >
          <Chevron dir="right" />
        </button>
      )}
    </div>
  );
}

function RankCard({
  entry,
  open,
  onToggle,
}: {
  entry: RankEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const main = entry.characters.find((c) => c.is_main) ?? entry.characters[0] ?? null;
  const mainAvatar = main?.avatar_url ?? null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`w-full h-full text-left rounded-xl border bg-[#0c1220] transition-all duration-300 overflow-hidden ${
        open
          ? "border-yellow-400/35 ring-1 ring-yellow-400/20"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 min-w-0">
        {mainAvatar ? (
          <img
            src={mainAvatar}
            alt={`Avatar de ${entry.username}`}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-white/15 shrink-0 object-cover"
          />
        ) : (
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gray-800 border border-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-gray-400">
            {initials(entry.username)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate text-sm sm:text-base">
            {entry.username}
          </p>
          <div
            className={`grid transition-all duration-300 ease-out ${
              open
                ? "grid-rows-[1fr] opacity-100 mt-1"
                : "grid-rows-[0fr] opacity-0 max-md:mt-0 md:grid-rows-[1fr] md:opacity-100 md:mt-1"
            }`}
          >
            <div className="overflow-hidden">
              <p className="text-yellow-400 font-bold text-sm sm:text-base tabular-nums whitespace-nowrap">
                {entry.points.toLocaleString()}{" "}
                <span className="text-[11px] sm:text-xs font-semibold text-yellow-400/85">
                  ptos
                </span>
              </p>
              {entry.points !== entry.total_points && (
                <p className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
                  {entry.total_points.toLocaleString()} en total
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
