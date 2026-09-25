"use client";

import { useState } from "react";
import type { StoryPending } from "@/lib/stories";
import { relationLabel } from "@/lib/relations";

export default function StoryReviewPanel({ pending }: { pending: StoryPending[] }) {
  const [items, setItems] = useState(pending);
  const [loading, setLoading] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function handle(item: StoryPending, action: "approve" | "reject", override = false) {
    setLoading(`${item.id}-${action}`);
    const res = await fetch(`/api/admin/stories/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason[item.id] ?? null, override }),
    });
    setLoading(null);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay historias pendientes.</p>;
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <article key={item.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="font-bold text-lg">{item.title}</h2>
              <p className="text-sm text-gray-400">
                {item.character_name} · {item.character_realm} · {item.author_username}
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

          {item.biography && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3">{item.biography}</p>
          )}
          {item.personality && (
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-gray-500">Personalidad: </span>
              {item.personality}
            </p>
          )}
          {item.appearance && (
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-gray-500">Aspecto: </span>
              {item.appearance}
            </p>
          )}

          {item.relations?.length > 0 && (
            <div className="mt-3 text-xs text-gray-400 space-y-1">
              <p className="uppercase tracking-wider text-gray-500">Menciones</p>
              {item.relations.map((r) => (
                <p key={`${r.name}-${r.realm}`}>
                  {r.name} · {relationLabel(r.relation_type)} · {r.status}
                  {r.met_at ? ` · ${r.met_at}` : ""}
                </p>
              ))}
              {item.awaiting_relations && (
                <p className="text-amber-400">Faltan confirmaciones. Publicar ahora es decisión del Eremita.</p>
              )}
            </div>
          )}

          <textarea
            value={reason[item.id] ?? ""}
            onChange={(e) => setReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
            placeholder="Motivo si se rechaza (opcional)"
            rows={2}
            className="w-full mt-3 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handle(item, "approve", item.awaiting_relations)}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === `${item.id}-approve`
                ? "..."
                : item.awaiting_relations
                  ? "Publicar como Eremita"
                  : "Publicar"}
            </button>
            <button
              onClick={() => handle(item, "reject")}
              disabled={!!loading}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm disabled:opacity-50"
            >
              {loading === `${item.id}-reject` ? "..." : "Rechazar"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
