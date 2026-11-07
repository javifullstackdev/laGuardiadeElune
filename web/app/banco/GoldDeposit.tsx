"use client";

import { useMemo, useState, type FormEvent } from "react";

import NumberField from "./NumberField";
import { apiDetail } from "@/lib/bank";
import {
  formatMoney,
  GOLD_STATUS,
  pointsForCopper,
  type GoldBoard,
  type GoldDeposit as GoldRow,
} from "@/lib/gold";
import { foreverModeLabel } from "@/lib/wow";

type CharacterOpt = { name: string; realm: string; is_main: boolean; game?: string };

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function digits(raw: string) {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function GoldDeposit({
  characters,
  initial,
}: {
  characters: CharacterOpt[];
  initial: GoldBoard;
}) {
  const forever = useMemo(
    () => characters.filter((c) => c.game === "forever"),
    [characters],
  );
  const [board, setBoard] = useState(initial);
  const [character, setCharacter] = useState(() => {
    const pick = forever.find((c) => c.is_main) ?? forever[0];
    return pick ? `${pick.name}::${pick.realm}` : "";
  });
  const [gold, setGold] = useState("0");
  const [silver, setSilver] = useState("0");
  const [copper, setCopper] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const copperTotal = digits(gold) * 10000 + digits(silver) * 100 + digits(copper);
  const estimate = pointsForCopper(copperTotal, board.silver_per_point);
  const goal = Math.max(board.goal_copper, 1);
  const progress = Math.min(100, Math.round((board.confirmed_copper / goal) * 100));

  async function reload() {
    const res = await fetch("/api/bank/gold");
    const data = await res.json().catch(() => null);
    if (res.ok && data && Array.isArray(data.deposits)) setBoard(data);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!character) {
      setError("Elige un personaje de Warcraft Forever");
      return;
    }
    if (copperTotal < 1) {
      setError("Indica cuánto oro, plata o cobre envías");
      return;
    }
    const [character_name, character_realm] = character.split("::");
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/bank/gold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_name,
        character_realm,
        gold: digits(gold),
        silver: digits(silver),
        copper: digits(copper),
        note: note.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo registrar el envío"));
      return;
    }
    setGold("0");
    setSilver("0");
    setCopper("0");
    setNote("");
    setOk("Envío registrado. Los puntos se anotan cuando el líder confirme que el oro ha llegado.");
    await reload();
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/bank/gold/${id}/cancel`, { method: "POST" });
    if (res.ok) await reload();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5 max-w-xl">
        <p className="text-sm text-gray-300">
          Oro de Warcraft Forever, no de Retail. Lo envía un personaje de Forever al líder de la
          hermandad, para la pestaña del banco. 100 cobres son 1 plata y 100 platas son 1 oro.
          Ahora mismo, 1 punto por cada {board.silver_per_point} de plata. Los puntos no se anotan
          hasta que el líder confirma que el oro ha llegado.
        </p>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Confirmado: {formatMoney(board.confirmed_copper)}</span>
            <span>Objetivo: {formatMoney(board.goal_copper)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-yellow-400" style={{ width: `${progress}%` }} />
          </div>
          {board.pending_copper > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Pendiente de confirmar: {formatMoney(board.pending_copper)}
            </p>
          )}
        </div>
      </section>

      {forever.length === 0 ? (
        <p className="text-sm text-gray-500 max-w-xl">
          Necesitas un personaje de Warcraft Forever en tu perfil para enviar oro.
        </p>
      ) : (
        <form onSubmit={submit} className="max-w-xl space-y-4">
          <label className="block text-sm text-gray-400">
            Personaje de Forever
            <select
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="elune-select mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            >
              {forever.map((c) => (
                <option key={`${c.name}-${c.realm}`} value={`${c.name}::${c.realm}`}>
                  {c.name} · {foreverModeLabel(c.realm)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm text-gray-400">
              Oro
              <NumberField min={0} max={100000} value={gold} onChange={setGold} />
            </label>
            <label className="block text-sm text-gray-400">
              Plata
              <NumberField min={0} max={100000} value={silver} onChange={setSilver} />
            </label>
            <label className="block text-sm text-gray-400">
              Cobre
              <NumberField min={0} max={100000} value={copper} onChange={setCopper} />
            </label>
          </div>
          <label className="block text-sm text-gray-400">
            Nota (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            />
          </label>
          <p className="text-sm text-gray-400">
            {copperTotal < 1 ? (
              "Indica la cantidad."
            ) : (
              <>
                {formatMoney(copperTotal)}. Si se confirma:{" "}
                <span className="text-yellow-400 font-medium">{estimate} pts</span>
              </>
            )}
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {ok && <p className="text-sm text-emerald-400">{ok}</p>}
          <button
            type="submit"
            disabled={busy || copperTotal < 1}
            className="px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Registrar envío"}
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {board.deposits.map((row: GoldRow) => (
          <li key={row.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex gap-3 items-start">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-yellow-100">{formatMoney(row.copper)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {GOLD_STATUS[row.status]} · {fmtWhen(row.created_at)} · {row.character_name}
              </p>
              {row.status === "pending" && (
                <p className="text-xs text-gray-500 mt-1">
                  Estimado {row.current_points ?? row.estimated_points} pts con la tarifa actual
                </p>
              )}
              {row.status === "approved" && (
                <p className="text-xs text-yellow-400 mt-1">
                  {row.awarded_points ? `+${row.awarded_points} pts` : "Confirmado sin puntos"}
                </p>
              )}
              {row.admin_note && <p className="text-xs text-gray-500 mt-1">{row.admin_note}</p>}
            </div>
            {row.status === "pending" && (
              <button
                type="button"
                onClick={() => cancel(row.id)}
                className="text-xs text-gray-500 hover:text-red-400"
              >
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
