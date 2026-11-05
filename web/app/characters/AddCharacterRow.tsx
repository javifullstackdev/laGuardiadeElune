"use client";

import { useState } from "react";

type BlizzardCharacter = {
  name: string;
  realm: string;
  realm_name: string;
  class_id: number;
  race_id: number;
  class_name: string;
  race_name: string;
  level: number;
  faction: string;
  gender?: string | null;
  blizzard_character_id: number;
  game?: string;
  surname?: string | null;
};

export default function AddCharacterRow({ c }: { c: BlizzardCharacter }) {
  const isForever = c.game === "forever";
  const [isMain, setIsMain] = useState(false);
  const fullName = [c.name, c.surname].filter(Boolean).join(" ");

  return (
    <li className="border rounded-lg px-4 py-3 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <span className="font-semibold">{fullName}</span>
          <span className="text-gray-400 text-sm ml-1">· {c.realm_name}</span>
          <span className="text-xs text-gray-500 ml-2">
            Nv.{c.level} {c.class_name}
            {c.race_name ? ` (${c.race_name})` : ""}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded shrink-0 ${
            isForever
              ? "bg-amber-500/15 text-amber-700"
              : "bg-blue-600/10 text-blue-700"
          }`}
        >
          {isForever ? "Forever" : "Retail"}
        </span>
      </div>

      <form method="POST" action="/api/characters/add" className="flex items-center gap-2 flex-wrap">
        <input type="hidden" name="name" value={c.name} />
        <input type="hidden" name="realm" value={c.realm} />
        <input type="hidden" name="class_id" value={c.class_id} />
        <input type="hidden" name="race_id" value={c.race_id} />
        <input type="hidden" name="level" value={c.level} />
        <input type="hidden" name="faction" value={c.faction} />
        <input type="hidden" name="gender" value={c.gender ?? ""} />
        <input type="hidden" name="blizzard_character_id" value={c.blizzard_character_id} />
        <input type="hidden" name="game" value={isForever ? "forever" : "retail"} />
        <input type="hidden" name="surname" value={c.surname ?? ""} />

        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isMain}
            onChange={(e) => setIsMain(e.target.checked)}
            className="rounded"
          />
          Establecer como main
        </label>
        <input type="hidden" name="is_main" value={isMain ? "true" : "false"} />

        <button
          type="submit"
          className={`ml-auto text-xs px-4 py-1.5 rounded font-medium transition-colors text-white ${
            isForever ? "bg-amber-500 hover:bg-amber-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isForever ? "Añadir de Forever" : "Añadir de Retail"}
        </button>
      </form>
    </li>
  );
}
