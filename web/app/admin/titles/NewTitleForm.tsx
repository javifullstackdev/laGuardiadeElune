"use client";

import { useEffect, useState } from "react";

type Option = { value: string; label: string };

type Hit = { id: number; name: string; already_linked: boolean };

type Detail = {
  id: number;
  name: string;
  template: string;
  slot: string;
  achievements: string[];
};

const SEARCH_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500";

async function readJson(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail ?? fallback);
  return body;
}

export default function NewTitleForm({ sourceOptions }: { sourceOptions: Option[] }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [linked, setLinked] = useState<Detail | null>(null);

  const [name, setName] = useState("");
  const [slot, setSlot] = useState("title");
  const [source, setSource] = useState("custom");
  const [description, setDescription] = useState("");

  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/admin/titles/blizzard-index?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        setHits(await readJson(res, "No se pudo buscar en Blizzard"));
      } catch (err) {
        if (controller.signal.aborted) return;
        setHits([]);
        setSearchError(err instanceof Error ? err.message : "No se pudo buscar en Blizzard");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, trimmed]);

  async function pick(hit: Hit) {
    if (hit.already_linked) return;
    setSearchError(null);
    try {
      const res = await fetch(`/api/admin/titles/blizzard-index/${hit.id}`);
      const detail: Detail = await readJson(res, "No se pudo leer el título");

      setLinked(detail);
      setName(detail.name);
      setSlot(detail.slot);
      if (detail.achievements.length > 0) {
        setSource("achievement");
        setDescription(`Logro de WoW: ${detail.achievements.join(" / ")}`);
      }
      setQuery("");
      setHits([]);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "No se pudo leer el título");
    }
  }

  const visibleHits = canSearch ? hits : [];

  return (
    <form action="/api/admin/titles" method="POST" className="space-y-4">
      <input type="hidden" name="blizzard_title_id" value={linked?.id ?? ""} />

      <div>
        <label className="block text-sm text-gray-400 mb-1">Título de Blizzard (opcional)</label>
        {linked ? (
          <div className="flex items-start justify-between gap-4 bg-gray-800 border border-sky-500/30 rounded-lg px-3 py-2">
            <div className="min-w-0 text-sm">
              <p className="text-sky-300">
                Enlazado con Blizzard #{linked.id} · <span className="text-gray-300">{linked.template}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Se otorgará solo a los personajes que lo tengan desbloqueado en el juego.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLinked(null)}
              className="text-xs text-gray-500 hover:text-red-400 shrink-0"
            >
              Quitar enlace
            </button>
          </div>
        ) : (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca por nombre, p.ej. Gladiador o Matarreyes"
              autoComplete="off"
              className={inputClass}
            />
            {searchError && <p className="text-xs text-red-400 mt-1">{searchError}</p>}
            {canSearch && searching && <p className="text-xs text-gray-500 mt-1">Buscando…</p>}
            {canSearch && !searching && !searchError && visibleHits.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Sin resultados.</p>
            )}
            {visibleHits.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700">
                {visibleHits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      disabled={hit.already_linked}
                      onClick={() => pick(hit)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      {hit.name}
                      <span className="text-gray-500"> · #{hit.id}</span>
                      {hit.already_linked && (
                        <span className="text-gray-500"> · ya está en el catálogo</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Nombre del título *</label>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='p.ej. "Líder de la Guardia" o "Comandante"'
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Posición</label>
        <select
          name="slot"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className={inputClass}
        >
          <option value="title">Título (debajo del nombre)</option>
          <option value="prefix">Antetítulo (delante del nombre)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Origen</label>
        <select
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={inputClass}
        >
          {sourceOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Descripción</label>
        <input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción breve del título (opcional)"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
      >
        Crear título
      </button>
    </form>
  );
}
