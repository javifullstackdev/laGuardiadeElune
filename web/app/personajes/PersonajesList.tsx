"use client";

import { useMemo, useState } from "react";
import WikiTile from "../components/WikiTile";
import type { WikiListItem } from "@/lib/wiki";

function sortItems(items: WikiListItem[]) {
  return [...items].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "es", { sensitivity: "base" }),
  );
}

export default function PersonajesList({ items }: { items: WikiListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = sortItems(items);
    if (!q) return source;
    return source.filter((item) => {
      const name = item.name.toLowerCase();
      const display = item.display_name.toLowerCase();
      return name.includes(q) || display.includes(q);
    });
  }, [items, query]);

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="block flex-1 max-w-md">
          <span className="sr-only">Buscar personaje por nombre</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500"
          />
        </label>
        <p className="text-xs text-gray-500">
          {filtered.length} {filtered.length === 1 ? "personaje" : "personajes"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-16 text-center">
          Ningún personaje coincide con “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <li key={`${item.name}-${item.realm}`}>
              <WikiTile item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
