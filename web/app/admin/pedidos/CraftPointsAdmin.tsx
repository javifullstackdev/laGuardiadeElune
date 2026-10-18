"use client";

import { useState } from "react";

import { PATH_LABEL } from "@/lib/points";

export type CraftScoreRow = {
  id: string;
  profession_name: string;
  item_name: string;
  quantity: number;
  requester_name: string;
  crafter_name: string | null;
  crafter_character_name: string | null;
  crafter_character_realm: string | null;
  awarded_points: number | null;
  admin_note: string | null;
  scores_points: boolean;
  path: string | null;
  resolved_at: string | null;
};

function when(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detail(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const value = (data as { detail: unknown }).detail;
    if (typeof value === "string") return value;
  }
  return fallback;
}

export default function CraftPointsAdmin({
  pointsPerOrder,
  initial,
}: {
  pointsPerOrder: number;
  initial: CraftScoreRow[];
}) {
  const [points, setPoints] = useState(String(pointsPerOrder));
  const [saved, setSaved] = useState(pointsPerOrder);
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const pending = rows.filter((row) => row.awarded_points == null);
  const done = rows.filter((row) => row.awarded_points != null);

  async function reload() {
    const res = await fetch("/api/pedidos/admin");
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !Array.isArray(data.orders)) return;
    setRows(data.orders);
    setSaved(Number(data.points_per_order) || 0);
    setPoints(String(data.points_per_order ?? 0));
  }

  async function saveDefault() {
    const amount = Math.max(0, Math.min(5000, Number(points) || 0));
    setBusy("save");
    setError(null);
    setOk(null);
    const res = await fetch("/api/pedidos/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points_per_order: amount }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(detail(data, "No se pudo guardar el valor"));
      return;
    }
    setSaved(amount);
    setOk(`A partir de ahora, cada pedido recogido da ${amount} puntos.`);
  }

  async function scorePending(id: string) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/pedidos/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: saved, note: null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(detail(data, "No se pudieron anotar los puntos"));
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {ok && <p className="text-sm text-emerald-400">{ok}</p>}
      <section className="rounded-xl border border-white/10 bg-gray-900 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Puntos por pedido</h2>
        <label className="block text-sm text-gray-400">
          Puntos para el artesano
          <input
            type="number"
            min={0}
            max={5000}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy === "save" || points === ""}
          onClick={() => void saveDefault()}
          className="px-3 py-1.5 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
        >
          Guardar
        </button>
      </section>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recogidos sin puntos</h2>
          <ul className="space-y-3">
            {pending.map((row) => (
              <li key={row.id} className="rounded-xl border border-white/10 bg-gray-900 p-4 space-y-2">
                <p className="font-medium">
                  {row.quantity}× {row.item_name}
                </p>
                <p className="text-sm text-gray-400">
                  {row.profession_name}
                  {row.crafter_name ? ` · ${row.crafter_name}` : ""}
                  {row.path ? ` · ${PATH_LABEL[row.path] ?? row.path}` : ""}
                  {row.resolved_at ? ` · ${when(row.resolved_at)}` : ""}
                </p>
                <button
                  type="button"
                  disabled={busy === row.id}
                  onClick={() => void scorePending(row.id)}
                  className="px-3 py-1.5 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
                >
                  {row.scores_points ? `Anotar ${saved} puntos` : "Anotar sin puntos"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Ya anotados</h2>
          {done.map((row) => (
            <p key={row.id} className="text-sm text-gray-400">
              {row.awarded_points} pts · {row.quantity}× {row.item_name} ({row.profession_name})
              {row.crafter_name ? ` · ${row.crafter_name}` : ""}
              {row.admin_note ? ` · ${row.admin_note}` : ""}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
