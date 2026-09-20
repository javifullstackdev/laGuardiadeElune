"use client";

import { useState } from "react";

type PendingAvatar = {
  name: string;
  realm: string;
  game: string;
  owner_username: string;
  pending_avatar_url: string;
};

const GAME_LABEL: Record<string, string> = {
  retail:  "Retail",
  forever: "Forever",
};

export default function AvatarReviewPanel({ pending }: { pending: PendingAvatar[] }) {
  const [items, setItems]     = useState<PendingAvatar[]>(pending);
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(item: PendingAvatar, action: "approve" | "reject") {
    const key = `${item.name}-${item.realm}-${action}`;
    setLoading(key);
    const res = await fetch(`/api/admin/characters/avatar/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: item.name, realm: item.realm }),
    });
    setLoading(null);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => !(i.name === item.name && i.realm === item.realm)));
    }
  }

  if (items.length === 0) {
    return <p className="text-gray-500">No hay imágenes pendientes.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const key = `${item.name}-${item.realm}`;
        return (
          <div key={key} className="flex gap-5 bg-gray-900 rounded-xl border border-gray-800 p-5">
            {/* Preview */}
            <div className="w-28 h-36 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shrink-0">
              <img
                src={item.pending_avatar_url}
                alt={item.name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg">{item.name}</p>
              <p className="text-sm text-gray-400">{item.realm}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  {item.owner_username}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  item.game === "forever"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                }`}>
                  {GAME_LABEL[item.game] ?? item.game}
                </span>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => handle(item, "approve")}
                  disabled={!!loading}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading === `${key}-approve` ? "..." : "Aprobar"}
                </button>
                <button
                  onClick={() => handle(item, "reject")}
                  disabled={!!loading}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading === `${key}-reject` ? "..." : "Rechazar"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
