"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classColor, classLabel, realmLabel } from "@/lib/wow";

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
        const color = classColor(char.wow_class);
        const className = classLabel(char.wow_class);
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
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color }}>
                  {char.name}
                  <span className="text-gray-500 font-normal ml-1">
                    -{realmLabel(char.realm) ?? char.realm}
                  </span>
                </p>
                {className && (
                  <p className="text-xs text-gray-500">{className}</p>
                )}
              </div>
              {isSelected ? (
                <span className="text-yellow-400 text-sm font-medium">Main</span>
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
