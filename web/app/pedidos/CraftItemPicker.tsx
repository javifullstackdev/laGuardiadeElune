"use client";

import { useEffect, useState } from "react";

import ItemFlavor from "../banco/ItemFlavor";
import { apiDetail, qualityClass } from "@/lib/bank";

const SEARCH_DELAY_MS = 350;

export type CraftHit = {
  recipe_id: number;
  id: number | null;
  name: string;
  quality: string | null;
  icon_url: string | null;
  description: string | null;
  detail: string | null;
};

export default function CraftItemPicker({
  professionId,
  value,
  onChange,
}: {
  professionId: number;
  value: CraftHit | null;
  onChange: (item: CraftHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CraftHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          profession_id: String(professionId),
          q: trimmed,
        });
        const res = await fetch(`/api/pedidos/items/search?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(apiDetail(data, "No se pudo buscar en Blizzard"));
        setHits(Array.isArray(data) ? data : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setHits([]);
        setError(err instanceof Error ? err.message : "No se pudo buscar en Blizzard");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, professionId]);

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
        {value.icon_url ? (
          <img src={value.icon_url} alt="" className="w-9 h-9 rounded" />
        ) : (
          <div className="w-9 h-9 rounded bg-gray-800" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${qualityClass(value.quality)}`}>{value.name}</p>
          <ItemFlavor craftingLabel={value.detail} description={value.description} />
        </div>
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-white"
          onClick={() => onChange(null)}
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar en esta profesión…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
      />
      {searching && <p className="text-xs text-gray-500">Buscando…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!searching && trimmed.length >= 2 && hits.length === 0 && !error && (
        <p className="text-xs text-gray-500">No hay recetas de esta profesión con ese nombre.</p>
      )}
      {hits.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-lg border border-gray-800 divide-y divide-gray-800">
          {hits.map((hit) => (
            <li key={hit.recipe_id}>
              <button
                type="button"
                className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-800/80"
                onClick={() => {
                  onChange(hit);
                  setQuery("");
                  setHits([]);
                }}
              >
                {hit.icon_url ? (
                  <img src={hit.icon_url} alt="" className="w-8 h-8 rounded mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-800 mt-0.5" />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm truncate ${qualityClass(hit.quality)}`}>{hit.name}</span>
                  {hit.detail && (
                    <span className="block text-[11px] text-yellow-200/70 truncate">{hit.detail}</span>
                  )}
                  {hit.description && (
                    <span className="block text-[11px] text-gray-400 italic truncate">“{hit.description}”</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
