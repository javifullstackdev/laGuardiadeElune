"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const CLASS_COLOR: Record<string, string> = {
  WARRIOR: "#C79C6E", PALADIN: "#F58CBA", HUNTER: "#ABD473",
  ROGUE: "#FFF569", PRIEST: "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN: "#0070DE", MAGE: "#69CCF0", WARLOCK: "#9482C9",
  MONK: "#00FF96", DRUID: "#FF7D0A", DEMONHUNTER: "#A330C9", EVOKER: "#33937F",
};

const CLASS_ICON: Record<string, string> = {
  WARRIOR: "⚔️", PALADIN: "🛡️", HUNTER: "🏹", ROGUE: "🗡️",
  PRIEST: "✨", DEATH_KNIGHT: "💀", SHAMAN: "⚡", MAGE: "🔮",
  WARLOCK: "🔥", MONK: "🥋", DRUID: "🌿", DEMONHUNTER: "👁️", EVOKER: "🐉",
};

type Character = {
  name: string;
  realm: string;
  wow_class: string | null;
  is_main: boolean;
  is_verified: boolean;
};

export default function MainPicker({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(
    characters.find((c) => c.is_main)?.name ?? null
  );

  async function handleSetMain(char: Character) {
    setSelected(char.name);
    startTransition(async () => {
      await fetch("/api/characters/set-main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      router.refresh();
    });
  }

  return (
    <ul className="space-y-2 mt-3">
      {characters.map((char) => {
        const color = CLASS_COLOR[char.wow_class ?? ""] ?? "#888";
        const icon  = CLASS_ICON[char.wow_class ?? ""]  ?? "🧙";
        const isSelected = selected === char.name;

        return (
          <li key={`${char.name}-${char.realm}`}>
            <button
              onClick={() => handleSetMain(char)}
              disabled={isPending || isSelected}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-800/50"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color }}>
                  {char.name}
                  <span className="text-gray-500 font-normal ml-1">
                    -{char.realm}
                  </span>
                </p>
                {char.wow_class && (
                  <p className="text-xs text-gray-500">{char.wow_class}</p>
                )}
              </div>
              {isSelected ? (
                <span className="text-yellow-400 text-sm">⭐ Main</span>
              ) : (
                <span className="text-gray-600 text-xs">
                  {isPending ? "..." : "Establecer"}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
