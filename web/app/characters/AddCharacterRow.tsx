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
  blizzard_character_id: number;
};

export default function AddCharacterRow({ c }: { c: BlizzardCharacter }) {
  const [game, setGame]       = useState<"retail" | "forever">("retail");
  const [surname, setSurname] = useState("");
  const [isMain, setIsMain]   = useState(false);

  return (
    <li className="border rounded-lg px-4 py-3 space-y-3">
      {/* Fila principal */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <span className="font-semibold">{c.name}</span>
          <span className="text-gray-400 text-sm ml-1">- {c.realm_name}</span>
          <span className="text-xs text-gray-500 ml-2">
            Nv.{c.level} {c.class_name} ({c.race_name})
          </span>
        </div>

        {/* Selector de juego */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setGame("retail")}
            className={`px-3 py-1.5 transition-colors ${
              game === "retail"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Retail
          </button>
          <button
            type="button"
            onClick={() => setGame("forever")}
            className={`px-3 py-1.5 transition-colors ${
              game === "forever"
                ? "bg-amber-500 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            Forever
          </button>
        </div>
      </div>

      {/* Apellido (solo Forever) */}
      {game === "forever" && (
        <div>
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="Apellido (obligatorio para Forever)"
            className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      )}

      {/* Acciones */}
      <form method="POST" action="/api/characters/add" className="flex items-center gap-2 flex-wrap">
        <input type="hidden" name="name"                   value={c.name} />
        <input type="hidden" name="realm"                  value={c.realm} />
        <input type="hidden" name="class_id"               value={c.class_id} />
        <input type="hidden" name="race_id"                value={c.race_id} />
        <input type="hidden" name="level"                  value={c.level} />
        <input type="hidden" name="faction"                value={c.faction} />
        <input type="hidden" name="blizzard_character_id"  value={c.blizzard_character_id} />
        <input type="hidden" name="game"                   value={game} />
        <input type="hidden" name="surname"                value={surname} />

        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_main_cb"
            checked={isMain}
            onChange={(e) => setIsMain(e.target.checked)}
            className="rounded"
          />
          Establecer como main
        </label>
        {/* is_main como hidden actualizado */}
        <input type="hidden" name="is_main" value={isMain ? "true" : "false"} />

        <button
          type="submit"
          disabled={game === "forever" && !surname.trim()}
          className={`ml-auto text-xs px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-40 ${
            game === "forever"
              ? "bg-amber-500 hover:bg-amber-400 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {game === "forever" ? "Añadir a Forever" : "Añadir a Retail"}
        </button>
      </form>
    </li>
  );
}
