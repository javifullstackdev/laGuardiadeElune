"use client";

import { useEffect, useState } from "react";

import { apiDetail, gradeLabel, qualityClass, type BankHit, type BankItem, type MaterialGrade } from "@/lib/bank";

const SEARCH_DELAY_MS = 350;

export type PickedItem = {
  blizzard_item_id: number;
  name: string;
  quality: string | null;
  icon_url: string | null;
  material_grade?: MaterialGrade;
  in_catalog: boolean;
};

function toPicked(hit: BankHit): PickedItem {
  return {
    blizzard_item_id: hit.id,
    name: hit.name,
    quality: hit.quality,
    icon_url: hit.icon_url,
    in_catalog: hit.in_catalog,
  };
}

export default function ItemPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: BankItem[];
  value: PickedItem | null;
  onChange: (item: PickedItem | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BankHit[]>([]);
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
        const res = await fetch(`/api/bank/items/search?q=${encodeURIComponent(trimmed)}`, {
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
  }, [trimmed]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
          {value.icon_url ? (
            <img src={value.icon_url} alt="" className="w-9 h-9 rounded" />
          ) : (
            <div className="w-9 h-9 rounded bg-gray-800" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${qualityClass(value.quality)}`}>{value.name}</p>
            <p className="text-xs text-gray-500">
              {value.material_grade && value.material_grade !== "none"
                ? gradeLabel(value.material_grade)
                : "Elige bronce, plata u oro si es un material"}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-white"
            onClick={() => onChange(null)}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar objeto (español)…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
          {searching && <p className="text-xs text-gray-500">Buscando…</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {hits.length > 0 && (
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-gray-800 divide-y divide-gray-800">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-800/80"
                    onClick={() => {
                      onChange(toPicked(hit));
                      setQuery("");
                      setHits([]);
                    }}
                  >
                    {hit.icon_url ? (
                      <img src={hit.icon_url} alt="" className="w-8 h-8 rounded" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-800" />
                    )}
                    <span className={`text-sm truncate ${qualityClass(hit.quality)}`}>{hit.name}</span>
                    {hit.in_catalog && (
                      <span className="ml-auto text-[11px] text-yellow-400/90 shrink-0">Catálogo</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {catalog.length > 0 && trimmed.length < 2 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Catálogo útil</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catalog.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-2 text-left hover:border-gray-600"
                      onClick={() =>
                        onChange({
                          blizzard_item_id: item.blizzard_item_id,
                          name: item.name,
                          quality: item.quality,
                          icon_url: item.icon_url,
                          material_grade: item.material_grade,
                          in_catalog: true,
                        })
                      }
                    >
                      {item.icon_url ? (
                        <img src={item.icon_url} alt="" className="w-7 h-7 rounded" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-gray-800" />
                      )}
                      <span className={`text-xs truncate ${qualityClass(item.quality)}`}>
                        {item.name}
                        {item.material_grade !== "none" ? ` · ${gradeLabel(item.material_grade)}` : ""}
                      </span>
                      <span className="ml-auto text-[11px] text-yellow-400/90 shrink-0">{item.points}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
