"use client";

import { useEffect, useState } from "react";
import { relationLabel, type RelationClaim } from "@/lib/relations";

export default function ClaimsInbox() {
  const [items, setItems] = useState<RelationClaim[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/claims/pending")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
  }, []);

  async function resolve(id: string, action: "confirm" | "reject") {
    setBusy(`${id}-${action}`);
    const res = await fetch(`/api/claims/${id}/${action}`, { method: "POST" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    setBusy(null);
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-amber-400">Te han nombrado</h3>
      {items.map((item) => (
        <div key={item.id} className="text-sm text-gray-300 space-y-2">
          <p>
            <span className="text-white font-medium">{item.from_name}</span>
            {" "}({item.author_username}) te menciona en «{item.story_title}» como{" "}
            {relationLabel(item.relation_type).toLowerCase()}.
            {item.met_at ? ` Se conocieron en ${item.met_at}.` : ""}
          </p>
          {item.note && <p className="text-gray-500">{item.note}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => resolve(item.id, "confirm")}
              className="px-3 py-1 rounded-lg text-xs bg-green-700 hover:bg-green-600 text-white"
            >
              Confirmar
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => resolve(item.id, "reject")}
              className="px-3 py-1 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-200"
            >
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
