"use client";

import { useState } from "react";

import { PATH_LABEL } from "@/lib/points";
import {
  apiDetail,
  gradeLabel,
  KIND_LABEL,
  qualityClass,
  type BankItem,
  type BankRequest,
  type MaterialGrade,
} from "@/lib/bank";
import GradeSelect from "@/app/banco/GradeSelect";
import ItemPicker, { type PickedItem } from "@/app/banco/ItemPicker";

type Tab = "queue" | "catalog";

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BankAdmin({
  queue,
  catalog,
}: {
  queue: BankRequest[];
  catalog: BankItem[];
}) {
  const [tab, setTab] = useState<Tab>(queue.length ? "queue" : "catalog");
  const [pending, setPending] = useState(queue);
  const [items, setItems] = useState(catalog);
  const [picked, setPicked] = useState<PickedItem | null>(null);
  const [materialGrade, setMaterialGrade] = useState<MaterialGrade>("bronze");
  const [newPoints, setNewPoints] = useState("10");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(catalog.map((item) => [item.id, String(item.points)])),
  );

  async function reload() {
    const [qRes, cRes] = await Promise.all([
      fetch("/api/bank/admin/queue"),
      fetch("/api/bank/admin/items"),
    ]);
    const q = await qRes.json().catch(() => []);
    const c = await cRes.json().catch(() => []);
    if (qRes.ok && Array.isArray(q)) setPending(q);
    if (cRes.ok && Array.isArray(c)) {
      setItems(c);
      setRates(Object.fromEntries(c.map((item: BankItem) => [item.id, String(item.points)])));
    }
  }

  async function act(id: string, action: "approve" | "reject" | "complete") {
    setBusy(`${id}-${action}`);
    setError(null);
    const res = await fetch(`/api/bank/admin/requests/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amounts[id] === undefined || amounts[id] === "" ? null : Number(amounts[id]),
        note: notes[id]?.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo resolver"));
      return;
    }
    await reload();
  }

  async function saveRate(id: string) {
    const points = Number(rates[id]);
    if (!Number.isFinite(points) || points < 0) return;
    setBusy(`rate-${id}`);
    const res = await fetch(`/api/bank/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    });
    setBusy(null);
    if (res.ok) await reload();
  }

  async function addToCatalog() {
    if (!picked) return;
    setBusy("add");
    setError(null);
    const res = await fetch("/api/bank/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blizzard_item_id: picked.blizzard_item_id,
        name: picked.name,
        quality: picked.quality,
        material_grade: materialGrade,
        icon_url: picked.icon_url,
        points: Number(newPoints) || 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo guardar"));
      return;
    }
    setPicked(null);
    setNewPoints("10");
    await reload();
  }

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-gray-800">
        {(["queue", "catalog"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === id
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {id === "queue" ? `Cola (${pending.length})` : "Catálogo de puntos"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {tab === "queue" && (
        <ul className="space-y-4">
          {pending.length === 0 && <p className="text-gray-500">No hay solicitudes pendientes.</p>}
          {pending.map((row) => {
            const suggested = row.current_points ?? row.estimated_points ?? 0;
            return (
              <li key={row.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
                <div className="flex gap-3 items-start">
                  {row.item_icon_url ? (
                    <img src={row.item_icon_url} alt="" className="w-12 h-12 rounded" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      {KIND_LABEL[row.kind]} · {row.username}
                      {row.path ? ` · ${PATH_LABEL[row.path] ?? row.path}` : ""} · {fmtWhen(row.created_at)}
                    </p>
                    <p className={`text-lg font-medium ${qualityClass(row.item_quality)}`}>
                      {row.quantity}× {row.item_name}
                      {row.material_grade && row.material_grade !== "none"
                        ? ` · ${gradeLabel(row.material_grade)}`
                        : ""}
                    </p>
                    {row.character_name && (
                      <p className="text-xs text-gray-400">
                        {row.character_name}
                        {row.character_realm ? `-${row.character_realm}` : ""}
                      </p>
                    )}
                    {row.note && <p className="text-sm text-gray-400 mt-1">{row.note}</p>}
                  </div>
                </div>
                {row.kind === "deposit" && row.scores_points && (
                  <label className="block text-sm text-gray-400">
                    Puntos a otorgar
                    <input
                      type="number"
                      min={0}
                      value={amounts[row.id] ?? String(suggested)}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <span className="ml-2 text-xs text-gray-500">sugerido {suggested}</span>
                  </label>
                )}
                {row.kind === "deposit" && !row.scores_points && (
                  <p className="text-sm text-amber-400/90">
                    {row.path === "competitive"
                      ? "Itinerario competitivo: se valida el ingreso, sin puntos."
                      : "Sin itinerario Campaña/Híbrido: se valida el ingreso, sin puntos."}
                  </p>
                )}
                <label className="block text-sm text-gray-400">
                  Nota
                  <input
                    value={notes[row.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    placeholder={row.kind === "deposit" ? "opcional" : "obligatoria al rechazar"}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {row.kind === "deposit" ? (
                    <button
                      type="button"
                      disabled={busy === `${row.id}-approve`}
                      onClick={() => act(row.id, "approve")}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/90 text-black text-sm font-medium disabled:opacity-50"
                    >
                      Aceptar y dar puntos
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === `${row.id}-complete`}
                      onClick={() => act(row.id, "complete")}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/90 text-black text-sm font-medium disabled:opacity-50"
                    >
                      Marcar entregado
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === `${row.id}-reject`}
                    onClick={() => act(row.id, "reject")}
                    className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-sm disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "catalog" && (
        <div className="space-y-8">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4 max-w-xl">
            <h2 className="font-semibold">Añadir o actualizar objeto</h2>
            <p className="text-sm text-gray-400">
              El valor es por unidad y se puede cambiar cuando sobre o falte material.
            </p>
            <ItemPicker
              catalog={items}
              value={picked}
              onChange={(item) => {
                setPicked(item);
                if (item?.material_grade) setMaterialGrade(item.material_grade);
              }}
            />
            <GradeSelect value={materialGrade} onChange={setMaterialGrade} />
            <label className="block text-sm text-gray-400">
              Puntos por unidad
              <input
                type="number"
                min={0}
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                className="mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={!picked || busy === "add"}
              onClick={() => addToCatalog()}
              className="px-4 py-2 rounded-lg bg-yellow-500/90 text-black text-sm font-medium disabled:opacity-50"
            >
              Guardar en catálogo
            </button>
          </section>

          <ul className="space-y-2">
            {items.length === 0 && <p className="text-gray-500">El catálogo está vacío.</p>}
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3"
              >
                {item.icon_url ? (
                  <img src={item.icon_url} alt="" className="w-9 h-9 rounded" />
                ) : (
                  <div className="w-9 h-9 rounded bg-gray-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${qualityClass(item.quality)}`}>
                    {item.name}
                    {item.material_grade !== "none" ? ` · ${gradeLabel(item.material_grade)}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Oferta {item.pending_deposits} · Demanda {item.pending_withdrawals}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  value={rates[item.id] ?? String(item.points)}
                  onChange={(e) => setRates((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white"
                />
                <button
                  type="button"
                  disabled={busy === `rate-${item.id}`}
                  onClick={() => saveRate(item.id)}
                  className="text-xs text-yellow-400 hover:text-yellow-300"
                >
                  Actualizar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
