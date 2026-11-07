"use client";

import { useState } from "react";

import NumberField from "@/app/banco/NumberField";
import { apiDetail } from "@/lib/bank";
import { COPPER_PER_GOLD, formatMoney, type GoldBoard, type GoldDeposit } from "@/lib/gold";

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GoldAdmin({ initial }: { initial: GoldBoard }) {
  const [board, setBoard] = useState(initial);
  const [silverPerPoint, setSilverPerPoint] = useState(String(initial.silver_per_point));
  const [goalGold, setGoalGold] = useState(String(Math.round(initial.goal_copper / COPPER_PER_GOLD)));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/bank/admin/gold");
    const data = await res.json().catch(() => null);
    if (res.ok && data && Array.isArray(data.deposits)) {
      setBoard(data);
      setSilverPerPoint(String(data.silver_per_point));
      setGoalGold(String(Math.round(data.goal_copper / COPPER_PER_GOLD)));
    }
  }

  async function saveSettings() {
    setBusy("settings");
    setError(null);
    const res = await fetch("/api/bank/admin/gold/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        silver_per_point: Math.max(1, Number(silverPerPoint) || 1),
        goal_gold: Math.max(1, Number(goalGold) || 1),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo guardar la tarifa"));
      return;
    }
    if (Array.isArray(data.deposits)) setBoard(data);
  }

  async function resolve(row: GoldDeposit, action: "approve" | "reject") {
    setBusy(row.id);
    setError(null);
    const res = await fetch(`/api/bank/admin/gold/${row.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: notes[row.id]?.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo resolver el envío"));
      return;
    }
    await reload();
  }

  const goal = Math.max(board.goal_copper, 1);
  const progress = Math.min(100, Math.round((board.confirmed_copper / goal) * 100));

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <p className="text-sm text-gray-300 max-w-2xl">
          El oro es de Warcraft Forever. Los puntos se anotan al confirmar que ha llegado al líder,
          con la tarifa que haya en ese momento. 100 cobres son 1 plata y 100 platas son 1 oro.
        </p>
        <div className="mt-4 max-w-xl">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Confirmado: {formatMoney(board.confirmed_copper)}</span>
            <span>Objetivo: {formatMoney(board.goal_copper)}</span>
          </div>
          <div className="h-5 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-xl">
          <label className="block text-sm text-gray-400">
            Platas por punto
            <NumberField min={1} max={100000} value={silverPerPoint} onChange={setSilverPerPoint} />
          </label>
          <label className="block text-sm text-gray-400">
            Objetivo (oro)
            <NumberField min={1} max={1000000} value={goalGold} onChange={setGoalGold} />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={busy === "settings"}
          className="mt-4 px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
        >
          {busy === "settings" ? "Guardando…" : "Guardar tarifa"}
        </button>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="space-y-4">
        {board.deposits.length === 0 && <p className="text-gray-500">No hay oro pendiente de confirmar.</p>}
        {board.deposits.map((row) => (
          <li key={row.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="font-medium text-yellow-100">{formatMoney(row.copper)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {row.username} · {row.character_name} · {fmtWhen(row.created_at)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Si se confirma ahora: {row.current_points ?? 0} pts
              {row.estimated_points !== row.current_points ? ` · al enviarlo eran ${row.estimated_points}` : ""}
            </p>
            {row.note && <p className="text-sm text-gray-300 mt-2">{row.note}</p>}
            <label className="block text-sm text-gray-400 mt-3">
              Nota (opcional)
              <textarea
                value={notes[row.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                rows={2}
                className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
              />
            </label>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={busy === row.id}
                onClick={() => void resolve(row, "approve")}
                className="px-3 py-1.5 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
              >
                Confirmar llegada
              </button>
              <button
                type="button"
                disabled={busy === row.id}
                onClick={() => void resolve(row, "reject")}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:text-white disabled:opacity-50"
              >
                No ha llegado
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
