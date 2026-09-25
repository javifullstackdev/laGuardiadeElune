"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WikiTile from "../components/WikiTile";
import type { WikiListItem } from "@/lib/wiki";

function letterOf(item: WikiListItem) {
  const ch = item.display_name.trim().charAt(0).toLocaleUpperCase("es");
  return /[A-ZÁÉÍÓÚÑ]/.test(ch) ? ch.normalize("NFD").replace(/\p{Diacritic}/gu, "")[0] : "#";
}

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

  const groups = useMemo(() => {
    const map = new Map<string, WikiListItem[]>();
    for (const item of filtered) {
      const letter = letterOf(item);
      const list = map.get(letter) ?? [];
      list.push(item);
      map.set(letter, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const letters = groups.map(([letter]) => letter);

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
          {filtered.length} {filtered.length === 1 ? "personaje" : "personajes"} · A–Z
        </p>
      </div>

      {letters.length > 1 && (
        <nav aria-label="Índice alfabético" className="flex flex-wrap gap-1.5 mt-4">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letra-${letter}`}
              className="min-w-8 px-2 py-1 text-center text-xs rounded border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
            >
              {letter}
            </a>
          ))}
        </nav>
      )}

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-16 text-center">
          Ningún personaje coincide con “{query.trim()}”.
        </p>
      ) : (
        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-10">
          <section>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((item) => (
                <li key={`${item.name}-${item.realm}`}>
                  <WikiTile item={item} />
                </li>
              ))}
            </ul>
          </section>

          <aside className="mt-10 lg:mt-0">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Directorio A–Z</h2>
            <ol className="space-y-5">
              {groups.map(([letter, group]) => (
                <li key={letter} id={`letra-${letter}`}>
                  <p className="text-sm font-semibold text-yellow-500/80 mb-2">{letter}</p>
                  <ol className="space-y-1">
                    {group.map((item) => (
                      <li key={`${item.name}-${item.realm}`}>
                        <Link
                          href={`/personajes/${encodeURIComponent(item.realm)}/${encodeURIComponent(item.name)}`}
                          className="block text-sm text-gray-300 hover:text-white truncate"
                        >
                          {item.display_name}
                        </Link>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  );
}
