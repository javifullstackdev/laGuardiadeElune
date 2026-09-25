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

  function patch(id: string, field: "biography" | "personality" | "appearance" | "reason", value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handle(item: BioPending, action: "publish" | "reject") {
    setLoading(`${item.character_id}-${action}`);
    const draft = drafts[item.character_id];
    const res = await fetch(`/api/admin/bios/${item.character_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: draft?.reason ?? null,
        biography: draft?.biography ?? "",
        personality: draft?.personality ?? null,
        appearance: draft?.appearance ?? null,
      }),
    });
    setLoading(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.character_id !== item.character_id));
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay cuestionarios pendientes.</p>;
  }

  return (
    <div className="space-y-8">
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
