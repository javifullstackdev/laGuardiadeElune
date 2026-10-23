"use client";

import { useState } from "react";
import type { BioPending } from "@/lib/bio";

export default function BioReviewPanel({ pending }: { pending: BioPending[] }) {
  const [items, setItems] = useState(pending);
  const [drafts, setDrafts] = useState<Record<string, { biography: string; personality: string; appearance: string; reason: string }>>(
    () =>
      Object.fromEntries(
        pending.map((item) => [
          item.character_id,
          {
            biography: item.current_biography ?? "",
            personality: item.current_personality ?? "",
            appearance: item.current_appearance ?? "",
            reason: "",
          },
        ]),
      ),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [art, setArt] = useState<Record<string, { full: File | null; face: File | null }>>({});

  function patch(id: string, field: "biography" | "personality" | "appearance" | "reason", value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function setArtFile(id: string, kind: "full" | "face", file: File | null) {
    setArt((prev) => ({
      ...prev,
      [id]: {
        full: prev[id]?.full ?? null,
        face: prev[id]?.face ?? null,
        [kind]: file,
      },
    }));
  }

  async function handle(item: BioPending, action: "publish" | "reject") {
    setLoading(`${item.character_id}-${action}`);
    setError(null);
    const draft = drafts[item.character_id];
    let res: Response;
    if (action === "publish") {
      const body = new FormData();
      body.append("biography", draft?.biography ?? "");
      body.append("personality", draft?.personality ?? "");
      body.append("appearance", draft?.appearance ?? "");
      const files = art[item.character_id];
      if (files?.full) body.append("full_file", files.full);
      if (files?.face) body.append("face_file", files.face);
      res = await fetch(`/api/admin/bios/${item.character_id}`, { method: "POST", body });
    } else {
      res = await fetch(`/api/admin/bios/${item.character_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: draft?.reason ?? null,
        }),
      });
    }
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo guardar la ficha.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.character_id !== item.character_id));
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay cuestionarios pendientes.</p>;
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {items.map((item) => {
        const draft = drafts[item.character_id] ?? {
          biography: "",
          personality: "",
          appearance: "",
          reason: "",
        };
        return (
          <article key={item.character_id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">{item.character_name}</h2>
                <p className="text-sm text-gray-400">
                  {item.character_realm} · {item.author_username}
                  {item.bio_status === "published" ? " · Ya tiene ficha; pide un cambio" : ""}
                </p>
              </div>
              {item.cover_url && (
                <img
                  src={item.cover_url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover object-top border border-gray-800 shrink-0"
                />
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-500">Respuestas del jugador</h3>
              {item.answers.length === 0 ? (
                <p className="text-sm text-gray-500">No hay respuestas.</p>
              ) : (
                item.answers.map((answer) => (
                  <div key={answer.id}>
                    <p className="text-xs text-gray-500">{answer.prompt}</p>
                    <p className="text-sm text-gray-200 mt-1">{answer.value}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-500">Capturas in-game</h3>
              {(item.reference_images ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">Este jugador no ha adjuntado capturas.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(item.reference_images ?? []).map((image) => (
                    <div key={`${image.request_id}-${image.index}`} className="space-y-2">
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg overflow-hidden border border-gray-700 bg-black/40"
                      >
                        <img src={image.url} alt="" className="w-full h-36 object-contain" />
                      </a>
                      <a
                        href={`/api/image-requests/${image.request_id}/file?index=${image.index}`}
                        className="inline-flex text-xs font-medium text-cyan-400 hover:text-cyan-300"
                      >
                        Descargar {image.kind === "face" ? "cara" : "cuerpo"}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-500">Imagen que publicas tú</h3>
              <p className="text-xs text-gray-500">
                Si te convence la ficha, adjunta el arte generado. Se publica junto con el texto.
              </p>
              <label className="block text-xs text-gray-400">
                Imagen completa (ficha y carrusel)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setArtFile(item.character_id, "full", e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-gray-200"
                />
              </label>
              <label className="block text-xs text-gray-400">
                Foto de cara (ranking)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setArtFile(item.character_id, "face", e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-gray-200"
                />
              </label>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-gray-500">Texto de la ficha</h3>
              <textarea
                value={draft.biography}
                onChange={(e) => patch(item.character_id, "biography", e.target.value)}
                rows={8}
                placeholder="Biografía que verá todo el mundo..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
              />
              <textarea
                value={draft.personality}
                onChange={(e) => patch(item.character_id, "personality", e.target.value)}
                rows={3}
                placeholder="Personalidad (opcional)"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
              />
              <textarea
                value={draft.appearance}
                onChange={(e) => patch(item.character_id, "appearance", e.target.value)}
                rows={3}
                placeholder="Aspecto físico (opcional)"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
              />
              <textarea
                value={draft.reason}
                onChange={(e) => patch(item.character_id, "reason", e.target.value)}
                rows={2}
                placeholder="Motivo si pides cambios (opcional)"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handle(item, "publish")}
                disabled={!!loading || draft.biography.trim().length < 40}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {loading === `${item.character_id}-publish` ? "..." : "Publicar ficha"}
              </button>
              <button
                type="button"
                onClick={() => handle(item, "reject")}
                disabled={!!loading}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm disabled:opacity-50"
              >
                {loading === `${item.character_id}-reject` ? "..." : "Pedir cambios"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
