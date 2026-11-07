"use client";

import { useRef, useState } from "react";
import { relationLabel, type StoryRelation } from "@/lib/relations";

type SearchHit = {
  name: string;
  realm: string;
  owner_username: string;
};

export default function StoryCastField({
  storyId,
  relations,
  startOpen = false,
}: {
  storyId: string;
  relations: StoryRelation[];
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [cast, setCast] = useState(relations);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/characters/search?q=${encodeURIComponent(value)}`);
      const data: SearchHit[] = res.ok ? await res.json() : [];
      setHits(Array.isArray(data) ? data : []);
    }, 250);
  }

  async function add(hit: SearchHit) {
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/admin/stories/${storyId}/mentions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_name: hit.name, to_realm: hit.realm }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.detail === "string" ? data.detail : "No se pudo etiquetar");
      return;
    }
    if (Array.isArray(data)) setCast(data);
    setQuery("");
    setHits([]);
  }

  async function remove(person: StoryRelation) {
    setBusy(true);
    setNote(null);
    const res = await fetch(
      `/api/admin/stories/${storyId}/mentions?name=${encodeURIComponent(person.name)}&realm=${encodeURIComponent(person.realm)}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.detail === "string" ? data.detail : "No se pudo quitar");
      return;
    }
    if (Array.isArray(data)) setCast(data);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-200"
      >
        {open ? "Cerrar personajes" : "Personajes que aparecen"}
      </button>
      {open ? (
        <div className="space-y-2 rounded-lg border border-gray-800 p-3">
          {cast.length === 0 ? (
            <p className="text-xs text-gray-500">Todavía no hay nadie etiquetado.</p>
          ) : (
            <ul className="space-y-1">
              {cast.map((person) => (
                <li key={`${person.name}-${person.realm}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-gray-200">
                    {person.name}
                    <span className="text-gray-500"> · {person.realm}</span>
                    <span className="text-gray-600"> · {relationLabel(person.relation_type)}</span>
                    {person.met_at ? <span className="text-gray-600"> · {person.met_at}</span> : null}
                    {person.status && person.status !== "confirmed" ? (
                      <span className="text-amber-400"> · pendiente</span>
                    ) : null}
                  </span>
                  {person.relation_type === "appears" ? (
                    <button
                      type="button"
                      onClick={() => remove(person)}
                      disabled={busy}
                      className="shrink-0 text-xs text-gray-500 hover:text-red-300 disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Buscar en el roster para etiquetar"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
            />
            {query ? (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
                {hits.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-500">Sin resultados en la hermandad</p>
                ) : (
                  hits.map((hit) => (
                    <button
                      key={`${hit.name}-${hit.realm}`}
                      type="button"
                      disabled={busy}
                      onClick={() => add(hit)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50"
                    >
                      {hit.name} <span className="text-gray-500">{hit.realm}</span>
                      <span className="ml-2 text-xs text-gray-600">{hit.owner_username}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          {note ? <p className="text-[11px] text-gray-400">{note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
