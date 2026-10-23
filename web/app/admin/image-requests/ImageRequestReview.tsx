"use client";

import { useState } from "react";

type RequestItem = {
  id: string;
  kind: "face" | "full";
  status: string;
  form_answers: Record<string, string>;
  reference_image_url: string | null;
  reference_images?: string[];
  player_notes: string | null;
  created_at: string | null;
  owner_username: string | null;
  character: {
    name: string | null;
    realm: string | null;
    game: string | null;
  };
};

const KIND_LABEL = { face: "Foto de cara", full: "Imagen completa" };

const ANSWER_LABELS: Record<string, string> = {
  posture: "Postura o acción",
  expression: "Expresión",
  emphasis: "Énfasis",
  extra_notes: "Notas",
  race: "Raza",
  gender: "Género",
  class_or_role: "Clase / rol",
  physical_features: "Rasgos físicos",
  armor_style: "Estilo de armadura",
  armor_colors: "Colores",
  armor_details: "Detalles de armadura",
  weapon_right: "Mano derecha",
  weapon_left: "Mano izquierda",
  setting: "Escenario",
  time_of_day: "Momento del día",
  background_notes: "Fondo",
};

function imageList(item: RequestItem): string[] {
  const listed = (item.reference_images ?? []).filter(Boolean);
  if (listed.length > 0) return listed;
  return item.reference_image_url ? [item.reference_image_url] : [];
}

export default function ImageRequestReview({ initial }: { initial: RequestItem[] }) {
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);

  async function reject(id: string) {
    setLoading(`${id}-rejected`);
    setError(null);
    const res = await fetch(`/api/image-requests/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setLoading(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    else setError("No se pudo rechazar la solicitud.");
  }

  async function publish(item: RequestItem) {
    const file = files[item.id];
    if (!file) {
      setError("Adjunta el arte generado antes de publicarlo.");
      return;
    }
    setLoading(`${item.id}-publish`);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/image-requests/${item.id}/publish`, {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo publicar la imagen.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay capturas pendientes.</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {items.map((item) => {
        const images = imageList(item);
        return (
          <article
            key={item.id}
            className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">
                  {item.character.name}
                  {item.character.realm ? `-${item.character.realm}` : ""}
                </h2>
                <p className="text-sm text-gray-400">
                  {item.owner_username ?? "—"} · {KIND_LABEL[item.kind]}
                  {item.created_at
                    ? ` · ${new Date(item.created_at).toLocaleString("es-ES")}`
                    : ""}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  item.kind === "face"
                    ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                    : "bg-violet-500/15 text-violet-300 border-violet-500/30"
                }`}
              >
                {KIND_LABEL[item.kind]}
              </span>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-gray-500">Esta solicitud no tiene capturas.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((url, index) => (
                  <div key={`${item.id}-${index}`} className="space-y-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg overflow-hidden border border-gray-700 bg-black/40"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-40 object-contain"
                      />
                    </a>
                    <a
                      href={`/api/image-requests/${item.id}/file?index=${index}`}
                      className="inline-flex text-xs font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      Descargar
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 text-sm">
              {Object.entries(ANSWER_LABELS).map(([key, label]) => {
                const value = item.form_answers?.[key];
                if (!value?.trim()) return null;
                return (
                  <div key={key}>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="text-gray-200 whitespace-pre-wrap">{value}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-gray-800 bg-black/30 p-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-300">Publicar el arte</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Sube la imagen que has generado. Se publica en el personaje al momento.
                  Si estás revisando la ficha, también puedes incluirla allí.
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  setFiles((prev) => ({ ...prev, [item.id]: e.target.files?.[0] ?? null }))
                }
                className="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:text-gray-200"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!!loading || !files[item.id]}
                  onClick={() => publish(item)}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading === `${item.id}-publish` ? "..." : "Publicar imagen"}
                </button>
                <button
                  type="button"
                  disabled={!!loading}
                  onClick={() => reject(item.id)}
                  className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {loading === `${item.id}-rejected` ? "..." : "Rechazar"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
