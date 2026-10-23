"use client";

import { useMemo, useState } from "react";
import type { BioPublished } from "@/lib/bio";

type Draft = {
  biography: string;
  personality: string;
  appearance: string;
  full: File | null;
  face: File | null;
};

function sheetHref(item: BioPublished) {
  return `/personajes/${encodeURIComponent(item.character_realm)}/${encodeURIComponent(item.character_name)}`;
}

export default function PublishedSheetEditor({ initial }: { initial: BioPublished[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(initial[0]?.character_id ?? null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [fileTick, setFileTick] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.character_name} ${item.character_realm} ${item.author_username}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  function draftFor(item: BioPublished): Draft {
    return drafts[item.character_id] ?? {
      biography: item.biography ?? "",
      personality: item.personality ?? "",
      appearance: item.appearance ?? "",
      full: null,
      face: null,
    };
  }

  function patch(id: string, item: BioPublished, field: keyof Draft, value: string | File | null) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...draftFor(item), ...prev[id], [field]: value },
    }));
  }

  async function save(item: BioPublished) {
    const draft = draftFor(item);
    setLoading(item.character_id);
    setError(null);
    setSaved(null);
    const body = new FormData();
    body.append("biography", draft.biography);
    body.append("personality", draft.personality);
    body.append("appearance", draft.appearance);
    if (draft.full) body.append("full_file", draft.full);
    if (draft.face) body.append("face_file", draft.face);
    const res = await fetch(`/api/admin/bios/${item.character_id}/update`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo guardar la ficha.");
      return;
    }
    const next = data as BioPublished;
    setItems((prev) => prev.map((row) => (row.character_id === item.character_id ? next : row)));
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[item.character_id];
      return copy;
    });
    setSaved(item.character_id);
    setFileTick((prev) => ({ ...prev, [item.character_id]: (prev[item.character_id] ?? 0) + 1 }));
  }

  if (items.length === 0) {
    return <p className="text-gray-500">Aún no hay fichas publicadas.</p>;
  }

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por personaje, reino o jugador..."
        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">Ninguna ficha coincide con la búsqueda.</p>
      ) : (
        visible.map((item) => {
          const open = openId === item.character_id;
          const draft = draftFor(item);
          return (
            <article key={item.character_id} className="bg-gray-900 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.character_id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt=""
                    className="w-14 h-16 rounded-lg object-cover object-top border border-gray-800 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-16 rounded-lg bg-gray-800 border border-gray-700 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{item.character_name}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    {item.character_realm} · {item.author_username}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">{open ? "Cerrar" : "Editar"}</span>
              </button>

              {open && (
                <div className="px-4 pb-5 space-y-4 border-t border-gray-800 pt-4">
                  <a
                    href={sheetHref(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Ver ficha pública
                  </a>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block text-xs text-gray-400 space-y-2">
                      <span>Imagen de la ficha</span>
                      {item.cover_url && (
                        <img
                          src={item.cover_url}
                          alt=""
                          className="w-full max-h-52 rounded-lg object-contain bg-black/40 border border-gray-800"
                        />
                      )}
                      <input
                        key={`${item.character_id}-full-${fileTick[item.character_id] ?? 0}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => patch(item.character_id, item, "full", e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-gray-200"
                      />
                    </label>
                    <label className="block text-xs text-gray-400 space-y-2">
                      <span>Foto de cara (ranking)</span>
                      {item.face_url && (
                        <img
                          src={item.face_url}
                          alt=""
                          className="w-24 h-24 rounded-full object-cover border border-gray-800"
                        />
                      )}
                      <input
                        key={`${item.character_id}-face-${fileTick[item.character_id] ?? 0}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => patch(item.character_id, item, "face", e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-gray-200"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Si no eliges un archivo, se queda la imagen que ya está publicada.
                  </p>

                  <textarea
                    value={draft.biography}
                    onChange={(e) => patch(item.character_id, item, "biography", e.target.value)}
                    rows={8}
                    placeholder="Biografía"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
                  />
                  <textarea
                    value={draft.personality}
                    onChange={(e) => patch(item.character_id, item, "personality", e.target.value)}
                    rows={3}
                    placeholder="Personalidad (opcional)"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
                  />
                  <textarea
                    value={draft.appearance}
                    onChange={(e) => patch(item.character_id, item, "appearance", e.target.value)}
                    rows={3}
                    placeholder="Aspecto físico (opcional)"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => save(item)}
                      disabled={!!loading || draft.biography.trim().length < 40}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {loading === item.character_id ? "..." : "Guardar cambios"}
                    </button>
                    {saved === item.character_id && (
                      <p className="text-sm text-green-400">Cambios guardados.</p>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
