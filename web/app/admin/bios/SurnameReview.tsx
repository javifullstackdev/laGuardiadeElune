"use client";

import { useMemo, useState } from "react";

export type SurnameItem = {
  character_id: string;
  character_name: string;
  character_realm: string;
  author_username: string;
  surname: string;
  surname_allowed: boolean;
};

export default function SurnameReview({ initial }: { initial: SurnameItem[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.character_name} ${item.surname} ${item.character_realm} ${item.author_username}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  async function decide(item: SurnameItem, allowed: boolean) {
    setLoading(item.character_id);
    setError(null);
    const res = await fetch(`/api/admin/bios/${item.character_id}/surname`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowed }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo guardar.");
      return;
    }
    setItems((prev) =>
      prev.map((row) => (row.character_id === item.character_id ? { ...row, ...data } : row))
    );
  }

  if (items.length === 0) {
    return <p className="text-gray-500">Ningún personaje tiene apellido.</p>;
  }

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por apellido, personaje o jugador..."
        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">Ningún apellido coincide con la búsqueda.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.character_id}
              className="flex flex-wrap items-center gap-3 bg-gray-900 rounded-xl border border-gray-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {item.character_name}{" "}
                  <span className={item.surname_allowed ? "text-gray-200" : "text-red-300 line-through"}>
                    {item.surname}
                  </span>
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {item.character_realm} · {item.author_username}
                  {item.surname_allowed ? "" : " · oculto"}
                </p>
              </div>
              <button
                type="button"
                disabled={!!loading || item.surname_allowed}
                onClick={() => decide(item, true)}
                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-40"
              >
                {loading === item.character_id && !item.surname_allowed ? "..." : "Válido"}
              </button>
              <button
                type="button"
                disabled={!!loading || !item.surname_allowed}
                onClick={() => decide(item, false)}
                className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-40"
              >
                {loading === item.character_id && item.surname_allowed ? "..." : "No válido"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
