"use client";

import { useState } from "react";

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
  total_points: number;
  avatar_url: string | null;
  guild_title: string;
  characters: RankCharacter[];
};

export type RankGroup = {
  position: number;
  total_points: number;
  entries: RankEntry[];
};

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default function RankingBoard({ groups }: { groups: RankGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ol className="space-y-3 sm:space-y-4">
      {groups.map((group) => (
        <li
          key={`${group.position}-${group.total_points}`}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          <span className="shrink-0 w-[3.25rem] sm:w-[4rem] flex items-center justify-start font-quest-display font-bold text-yellow-400/90 leading-none text-[clamp(1.85rem,8vw,2.75rem)] tabular-nums pl-1 sm:pl-2">
            {group.position}º
          </span>

          <ul
            className={
              group.entries.length === 1
                ? "flex-1 min-w-0"
                : group.entries.length === 2
                  ? "flex-1 min-w-0 grid grid-cols-2 gap-2 sm:gap-3"
                  : "flex-1 min-w-0 flex gap-2 sm:gap-3 overflow-x-auto scrollbar-none overscroll-x-contain snap-x snap-mandatory"
            }
          >
            {group.entries.map((entry) => {
              const open = openId === entry.discord_id;
              return (
                <li
                  key={entry.discord_id}
                  className={
                    group.entries.length === 1
                      ? "min-w-0 w-full"
                      : group.entries.length === 2
                        ? "min-w-0"
                        : open
                          ? "min-w-[15.5rem] w-[15.5rem] sm:min-w-[17rem] sm:w-[17rem] shrink-0 snap-start"
                          : "min-w-[11.5rem] w-[11.5rem] sm:min-w-[13rem] sm:w-[13rem] shrink-0 snap-start"
                  }
                >
                  <RankCard
                    entry={entry}
                    open={open}
                    onToggle={() =>
                      setOpenId((id) => (id === entry.discord_id ? null : entry.discord_id))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
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
              open ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <p className="text-yellow-400 font-bold text-sm sm:text-base tabular-nums whitespace-nowrap">
                {entry.total_points.toLocaleString()}{" "}
                <span className="text-[11px] sm:text-xs font-semibold text-yellow-400/85">
                  ptos
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
