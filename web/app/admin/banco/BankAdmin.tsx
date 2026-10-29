"use client";

import { useState } from "react";

import { PATH_LABEL } from "@/lib/points";
import {
  apiDetail,
  asLotSize,
  catalogMatch,
  KIND_LABEL,
  qualityClass,
  rateLabel,
  stockLabel,
  type BankItem,
  type BankRequest,
  type LotSize,
  type MaterialGrade,
} from "@/lib/bank";
import GradeSelect from "@/app/banco/GradeSelect";
import ItemFlavor from "@/app/banco/ItemFlavor";
import LotSelect from "@/app/banco/LotSelect";
import NumberField from "@/app/banco/NumberField";
import ItemPicker, { type PickedItem } from "@/app/banco/ItemPicker";
import { GradeBadge } from "@/app/banco/QualityGem";

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
  const [newPoints, setNewPoints] = useState("1");
  const [newLot, setNewLot] = useState<LotSize>(1);
  const [newLimited, setNewLimited] = useState(false);
  const [newLimit, setNewLimit] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(catalog.map((item) => [item.id, String(item.points)])),
  );
  const [lots, setLots] = useState<Record<string, LotSize>>(
    Object.fromEntries(catalog.map((item) => [item.id, asLotSize(item.lot_size)])),
  );
  const [limited, setLimited] = useState<Record<string, boolean>>(
    Object.fromEntries(catalog.map((item) => [item.id, item.quantity_limit != null])),
  );
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(
      catalog.map((item) => [item.id, item.quantity_limit == null ? "" : String(item.quantity_limit)]),
    ),
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
      setLots(Object.fromEntries(c.map((item: BankItem) => [item.id, asLotSize(item.lot_size)])));
      setLimited(Object.fromEntries(c.map((item: BankItem) => [item.id, item.quantity_limit != null])));
      setLimits(
        Object.fromEntries(
          c.map((item: BankItem) => [item.id, item.quantity_limit == null ? "" : String(item.quantity_limit)]),
        ),
      );
    }
  }

  function limitPayload(isLimited: boolean, raw: string): number | null | undefined {
    if (!isLimited) return null;
    const cap = Number(raw);
    if (!Number.isFinite(cap) || cap < 0) return undefined;
    return cap;
  }

  async function act(id: string, action: "approve" | "reject" | "complete") {
    setBusy(`${id}-${action}`);
    setError(null);
    const res = await fetch(`/api/bank/admin/requests/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    const quantityLimit = limitPayload(Boolean(limited[id]), limits[id] ?? "");
    if (!Number.isFinite(points) || points < 0 || quantityLimit === undefined) {
      setError("Revisa los puntos y el cupo");
      return;
    }
    setBusy(`rate-${id}`);
    setError(null);
    const res = await fetch(`/api/bank/admin/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, lot_size: asLotSize(lots[id]), quantity_limit: quantityLimit }),
    });
    setBusy(null);
    if (res.ok) await reload();
    else {
      const data = await res.json().catch(() => ({}));
      setError(apiDetail(data, "No se pudo actualizar"));
    }
  }

  async function addToCatalog() {
    if (!picked) return;
    const quantityLimit = limitPayload(newLimited, newLimit);
    if (quantityLimit === undefined) {
      setError("Indica el cupo, o márcalo sin límite");
      return;
    }
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
        description: picked.description,
        crafting_label: picked.crafting_label,
        points: Number(newPoints) || 0,
        lot_size: newLot,
        quantity_limit: quantityLimit,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo guardar"));
      return;
    }
    setPicked(null);
    setNewPoints("1");
    setNewLot(1);
    setNewLimited(false);
    setNewLimit("");
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
            {id === "queue" ? `Cola (${pending.length})` : "Materiales publicados"}
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
                      {row.material_grade && row.material_grade !== "none" ? (
                        <>
                          {" · "}
                          <GradeBadge grade={row.material_grade} />
                        </>
                      ) : null}
                    </p>
                    <ItemFlavor craftingLabel={row.crafting_label} description={row.item_description} />
                    {row.character_name && (
                      <p className="text-xs text-gray-400">
                        {row.character_name}
                        {row.character_realm ? `-${row.character_realm}` : ""}
                      </p>
                    )}
                    {row.note && <p className="text-sm text-gray-400 mt-1">{row.note}</p>}
                  </div>
                </div>
                {row.kind === "deposit" && !row.published && (
                  <p className="text-sm text-amber-400/90">
                    Este material ya no está publicado. Rechaza la solicitud.
                  </p>
                )}
                {row.kind === "deposit" && row.published && (
                  <p className="text-sm text-gray-300">
                    {row.scores_points ? (
                      <>
                        Se otorgarán <span className="text-yellow-400 font-medium">{suggested} pts</span>
                        {row.lot_size > 1 ? ` · lotes de ${row.lot_size}` : ""}.{" "}
                      </>
                    ) : row.path === "competitive" ? (
                      "Itinerario competitivo: se valida el ingreso, sin puntos. "
                    ) : (
                      "Sin itinerario de artesanía y farmeo: se valida el ingreso, sin puntos. "
                    )}
                    {row.quantity_limit == null
                      ? "Este material no tiene cupo."
                      : `El cupo baja en ${row.quantity} (quedan ${row.remaining ?? 0}).`}
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
                      disabled={busy === `${row.id}-approve` || !row.published}
                      onClick={() => act(row.id, "approve")}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/90 text-black text-sm font-medium disabled:opacity-50"
                    >
                      {row.scores_points ? "Aceptar y dar puntos" : "Aceptar ingreso"}
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
            <h2 className="font-semibold">Publicar material</h2>
            <p className="text-sm text-gray-400">
              Elige el objeto y su calidad. Los puntos pueden ser por unidad, por 10 o por 100. Si
              pones cupo, al aceptar un ingreso esa cantidad se resta de lo que ven los miembros.
            </p>
            <ItemPicker
              catalog={items}
              value={picked}
              onChange={(item) => {
                setPicked(item);
                const grade = item?.material_grade ?? (item?.crafting_label ? "bronze" : materialGrade);
                if (item?.material_grade) setMaterialGrade(item.material_grade);
                else if (item?.crafting_label) setMaterialGrade("bronze");
                const hit = item ? catalogMatch(items, item.blizzard_item_id, grade) : undefined;
                if (hit) {
                  setNewPoints(String(hit.points));
                  setNewLot(asLotSize(hit.lot_size));
                  setNewLimited(hit.quantity_limit != null);
                  setNewLimit(hit.quantity_limit == null ? "" : String(hit.quantity_limit));
                }
              }}
            />
            <GradeSelect
              value={materialGrade}
              onChange={(grade) => {
                setMaterialGrade(grade);
                if (!picked) return;
                const hit = catalogMatch(items, picked.blizzard_item_id, grade);
                if (!hit) return;
                setNewPoints(String(hit.points));
                setNewLot(asLotSize(hit.lot_size));
                setNewLimited(hit.quantity_limit != null);
                setNewLimit(hit.quantity_limit == null ? "" : String(hit.quantity_limit));
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-gray-400">
                Puntos
                <NumberField min={0} value={newPoints} onChange={setNewPoints} />
              </label>
              <LotSelect value={newLot} onChange={setNewLot} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={newLimited}
                onChange={(e) => setNewLimited(e.target.checked)}
                className="accent-yellow-400"
              />
              Con cupo
            </label>
            {newLimited && (
              <label className="block text-sm text-gray-400">
                Cantidad total que se puede ingresar
                <NumberField min={0} value={newLimit} onChange={setNewLimit} />
              </label>
            )}
            <button
              type="button"
              disabled={!picked || busy === "add"}
              onClick={() => addToCatalog()}
              className="px-4 py-2 rounded-lg bg-yellow-500/90 text-black text-sm font-medium disabled:opacity-50"
            >
              Publicar
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
                    {item.material_grade !== "none" ? (
                      <>
                        {" · "}
                        <GradeBadge grade={item.material_grade} />
                      </>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {rateLabel(item.points, item.lot_size)} · {stockLabel(item)}
                    {item.quantity_limit != null ? ` · aceptado ${item.quantity_filled}` : ""}
                    {item.pending_deposit_qty > 0 ? ` · pendiente ${item.pending_deposit_qty}` : ""}
                    {item.remaining === 0 ? " · cubierto" : ""}
                  </p>
                </div>
                <NumberField
                  compact
                  min={0}
                  className="w-24"
                  value={rates[item.id] ?? String(item.points)}
                  onChange={(v) => setRates((prev) => ({ ...prev, [item.id]: v }))}
                />
                <LotSelect
                  compact
                  value={asLotSize(lots[item.id] ?? item.lot_size)}
                  onChange={(lot) => setLots((prev) => ({ ...prev, [item.id]: lot }))}
                />
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={Boolean(limited[item.id])}
                    onChange={(e) => setLimited((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                    className="accent-yellow-400"
                  />
                  Cupo
                </label>
                {limited[item.id] && (
                  <NumberField
                    compact
                    min={0}
                    className="w-24"
                    value={limits[item.id] ?? ""}
                    onChange={(v) => setLimits((prev) => ({ ...prev, [item.id]: v }))}
                  />
                )}
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
