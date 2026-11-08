"use client";

import { useState } from "react";

export type Application = {
  id: string;
  first_name: string;
  last_name: string;
  reason: string;
  status: string;
  created_at: string | null;
};

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export default function RecruitAdmin({ initial }: { initial: Application[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function markRead(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/recruitment/${id}/read`, { method: "POST" });
      if (!res.ok) return;
      const updated = (await res.json()) as Application;
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return <p className="mt-8 text-sm text-gray-400">Todavía no hay solicitudes.</p>;
  }

  return (
    <ul className="mt-8 space-y-4">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-quest-display text-lg text-white">
                {row.first_name} {row.last_name}
              </p>
              <p className="mt-1 text-xs text-gray-500">{when(row.created_at)}</p>
            </div>
            {row.status === "read" ? (
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">Leída</span>
            ) : (
              <button
                type="button"
                onClick={() => markRead(row.id)}
                disabled={busy === row.id}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 transition-colors hover:border-yellow-500/50 hover:text-yellow-200 disabled:opacity-50"
              >
                {busy === row.id ? "Guardando…" : "Marcar como leída"}
              </button>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{row.reason}</p>
        </li>
      ))}
    </ul>
  );
}
