"use client";

import { useState } from "react";

type RequestItem = {
  id: string;
  kind: "face" | "full";
  status: string;
  form_answers: Record<string, string>;
  prompt_data: Record<string, unknown>;
  reference_image_url: string;
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
  // compat con solicitudes antiguas
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

export default function ImageRequestReview({ initial }: { initial: RequestItem[] }) {
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function resolve(id: string, status: "done" | "rejected") {
    setLoading(`${id}-${status}`);
    const res = await fetch(`/api/image-requests/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function copyPrompt(item: RequestItem) {
    const text = JSON.stringify(item.prompt_data, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay solicitudes pendientes.</p>;
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
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

          <div className="grid md:grid-cols-[14rem_1fr] gap-4">
            <a
              href={item.reference_image_url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg overflow-hidden border border-gray-700 bg-black/40"
            >
              <img
                src={item.reference_image_url}
                alt="Captura de referencia"
                className="w-full h-auto max-h-64 object-contain"
              />
            </a>

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
          </div>

          <div className="rounded-lg border border-gray-800 bg-black/30 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-gray-400">Prompt JSON (image_prompt_data)</p>
              <button
                type="button"
                onClick={() => copyPrompt(item)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {copied === item.id ? "Copiado" : "Copiar JSON"}
              </button>
            </div>
            <pre className="text-[11px] text-gray-400 overflow-x-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(item.prompt_data, null, 2)}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => resolve(item.id, "done")}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === `${item.id}-done` ? "..." : "Marcar hecha"}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => resolve(item.id, "rejected")}
              className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === `${item.id}-rejected` ? "..." : "Rechazar"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
