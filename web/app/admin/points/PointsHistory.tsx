"use client";

import { useMemo, useState, type FormEvent } from "react";

import { BUCKET_LABEL, CATEGORY_LABEL, type Bucket } from "@/lib/points";

export type HistoryTx = {
  id: string;
  user_id: string;
  username: string;
  discord_username: string | null;
  character_name: string | null;
  character_realm: string | null;
  amount: number;
  counted_amount: number;
  reason: string;
  admin_note: string | null;
  event_category: string | null;
  bucket: Bucket;
  weekly_capped: boolean;
  active: boolean;
  occurred_at: string;
  created_at: string;
  processed_run_id: string | null;
  guild_characters: string[];
  dungeon: string | null;
  dungeon_slug: string | null;
  dungeon_image_url: string | null;
  mythic_level: number | null;
  timed: boolean | null;
  completed_at: string | null;
};

type RunGroup = {
  key: string;
  kind: "run";
  at: string;
  txs: HistoryTx[];
};

type SingleGroup = {
  key: string;
  kind: "single";
  at: string;
  tx: HistoryTx;
};

type Group = RunGroup | SingleGroup;

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg);
    }
  }
  return fallback;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtWhen(iso: string) {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

function splitReason(reason: string) {
  const i = reason.indexOf(" — ");
  if (i === -1) return { title: reason, detail: null as string | null };
  return { title: reason.slice(0, i), detail: reason.slice(i + 3) };
}

function groupHistory(rows: HistoryTx[]): Group[] {
  const runs = new Map<string, HistoryTx[]>();
  const singles: HistoryTx[] = [];
  for (const row of rows) {
    if (row.processed_run_id) {
      const list = runs.get(row.processed_run_id) ?? [];
      list.push(row);
      runs.set(row.processed_run_id, list);
    } else {
      singles.push(row);
    }
  }
  const groups: Group[] = [
    ...[...runs.entries()].map(([id, txs]) => ({
      key: `run-${id}`,
      kind: "run" as const,
      at: txs.reduce((latest, tx) => (tx.occurred_at > latest ? tx.occurred_at : latest), txs[0].occurred_at),
      txs,
    })),
    ...singles.map((tx) => ({
      key: `tx-${tx.id}`,
      kind: "single" as const,
      at: tx.occurred_at,
      tx,
    })),
  ];
  groups.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return groups;
}

export default function PointsHistory({
  rows,
  onSearch,
  onReload,
}: {
  rows: HistoryTx[];
  onSearch: (q: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => groupHistory(rows), [rows]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await onSearch(query);
    setBusy(false);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Historial</h2>
          <p className="text-sm text-gray-400 mt-1">
            Cada asignación de puntos. Las míticas agrupan a quien puntuó en la web y listan el
            grupo de hermandad.
          </p>
        </div>
        <form onSubmit={search} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador, mazmorra, motivo…"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-2 rounded-lg disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay asignaciones de puntos.</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) =>
            group.kind === "run" ? (
              <li key={group.key}>
                <RunCard txs={group.txs} onChanged={onReload} />
              </li>
            ) : (
              <li key={group.key}>
                <TxCard tx={group.tx} onChanged={onReload} />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function RunCard({ txs, onChanged }: { txs: HistoryTx[]; onChanged: () => Promise<void> }) {
  const sample = txs[0];
  const when = sample.completed_at ?? sample.occurred_at;
  const title = sample.dungeon || splitReason(sample.reason).title;

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <header className="relative min-h-[13rem] isolate">
        {sample.dungeon_image_url ? (
          <img
            src={sample.dungeon_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/75 to-black/25" />
        <div className="relative z-10 flex flex-col justify-end min-h-[13rem] p-5">
          <p className="text-xs uppercase tracking-wider text-yellow-400/90">
            {sample.timed === true ? "A tiempo" : sample.timed === false ? "Fuera de tiempo" : "Mítica+"}
          </p>
          <h3 className="text-2xl font-quest-display font-bold text-white mt-1 leading-tight">
            {title}
            {sample.mythic_level != null && (
              <span className="text-yellow-400"> +{sample.mythic_level}</span>
            )}
          </h3>
          <p className="text-sm text-gray-200 mt-2">
            {fmtDate(when)}
            <span className="text-gray-500"> · </span>
            {fmtTime(when)}
          </p>
          {sample.guild_characters.length > 0 && (
            <p className="text-sm text-gray-200 mt-3">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-0.5">
                Participantes
              </span>
              {sample.guild_characters.join(", ")}
            </p>
          )}
        </div>
      </header>
      <div className="hidden sm:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_auto] gap-3 px-5 py-2 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
        <span>Personaje</span>
        <span>Jugador</span>
        <span className="text-right">Puntos</span>
        <span className="text-right">Acciones</span>
      </div>
      <ul className="divide-y divide-gray-800">
        {txs.map((tx) => (
          <li key={tx.id} className="px-5 py-3">
            <TxBody tx={tx} compact onChanged={onChanged} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function TxCard({ tx, onChanged }: { tx: HistoryTx; onChanged: () => Promise<void> }) {
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
      <TxBody tx={tx} onChanged={onChanged} />
    </article>
  );
}

function TxBody({
  tx,
  compact = false,
  onChanged,
}: {
  tx: HistoryTx;
  compact?: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(tx.amount));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { title, detail } = splitReason(tx.reason);
  const category = tx.event_category ? CATEGORY_LABEL[tx.event_category] ?? tx.event_category : null;
  const counted = tx.counted_amount;
  const partial = tx.weekly_capped && counted !== tx.amount;

  async function send(path: string, body: object) {
    setSaving(true);
    setError(null);
    const res = await fetch(path, {
      method: path.endsWith("/void") ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo guardar el cambio"));
      return;
    }
    setOpen(false);
    setNote("");
    await onChanged();
  }

  const pointsClass = !tx.active
    ? "text-gray-500 line-through"
    : counted > 0
      ? "text-green-400"
      : "text-gray-400";

  return (
    <div className={tx.active ? "" : "opacity-60"}>
      {compact ? (
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem_auto] gap-2 sm:gap-3 sm:items-center">
          <div className="min-w-0">
            <p className="font-medium text-gray-100 truncate">
              {tx.character_name ?? "—"}
              {!tx.active && (
                <span className="ml-2 text-[11px] uppercase tracking-wide text-red-400">Anulada</span>
              )}
            </p>
            {tx.character_realm && (
              <p className="text-xs text-gray-500 truncate">{tx.character_realm}</p>
            )}
          </div>
          <p className="text-sm text-gray-300 truncate">{tx.username}</p>
          <p className={`font-bold tabular-nums sm:text-right ${pointsClass}`}>
            {counted > 0 ? "+" : ""}
            {counted}
            {partial && tx.active ? (
              <span className="block text-[11px] font-normal text-gray-500">de {tx.amount}</span>
            ) : null}
          </p>
          <div className="flex sm:justify-end gap-2">
            {tx.active && (
              <>
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-300 hover:border-yellow-400/50 hover:text-yellow-400"
                >
                  {open ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-red-900/60 text-red-300 hover:bg-red-950/40"
                >
                  Anular
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-gray-100">
              {tx.username}
              {tx.character_name ? (
                <span className="text-gray-400 font-normal"> · {tx.character_name}</span>
              ) : null}
              {!tx.active && (
                <span className="ml-2 text-[11px] uppercase tracking-wide text-red-400">Anulada</span>
              )}
            </p>
            <p className="text-sm text-gray-200 mt-1">{title}</p>
            {detail && <p className="text-xs text-gray-400 mt-0.5">{detail}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {category}
              {category ? " · " : ""}
              {BUCKET_LABEL[tx.bucket]}
              {tx.weekly_capped ? "" : " · ajuste de admin"}
              {" · "}
              {fmtWhen(tx.occurred_at)}
            </p>
            {tx.admin_note && (
              <p className="text-xs text-amber-400/90 mt-1">Motivo admin: {tx.admin_note}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`font-bold tabular-nums ${pointsClass}`}>
              {counted > 0 ? "+" : ""}
              {counted}
            </p>
            {partial && tx.active && (
              <p className="text-[11px] text-gray-500">de {tx.amount} (tope)</p>
            )}
            {tx.active && (
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-300 hover:text-yellow-400"
                >
                  {open ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-red-900/60 text-red-300"
                >
                  Anular
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {compact && tx.admin_note && (
        <p className="text-xs text-amber-400/90 mt-2">Motivo admin: {tx.admin_note}</p>
      )}

      {open && tx.active && (
        <form
          className="mt-3 pt-3 border-t border-gray-800 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(`/api/admin/points/${tx.id}`, { amount: Number(amount), reason: note });
          }}
        >
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-gray-400">
              Puntos
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none"
              />
            </label>
            <label className="text-xs text-gray-400 flex-1 min-w-[12rem]">
              Motivo del cambio o anulación
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                placeholder="Obligatorio"
                className="block mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full focus:outline-none"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="text-sm bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              Guardar cantidad
            </button>
            <button
              type="button"
              disabled={saving || !note.trim()}
              onClick={() => send(`/api/admin/points/${tx.id}/void`, { reason: note })}
              className="text-sm bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-900/60 px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              Anular asignación
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
