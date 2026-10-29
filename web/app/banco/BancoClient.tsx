"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  apiDetail,
  catalogMatch,
  KIND_LABEL,
  pointsForQuantity,
  qualityClass,
  rateLabel,
  STATUS_LABEL,
  stockLabel,
  type BankItem,
  type BankRequest,
  type MaterialGrade,
} from "@/lib/bank";
import GradeSelect from "./GradeSelect";
import ItemFlavor from "./ItemFlavor";
import ItemPicker, { type PickedItem } from "./ItemPicker";
import NumberField from "./NumberField";
import { GradeBadge } from "./QualityGem";

type CharacterOpt = { name: string; realm: string; is_main: boolean };
type Tab = "deposit" | "withdrawal" | "history";

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BancoClient({
  catalog,
  initialRequests,
  characters,
  scoresBankPoints,
}: {
  catalog: BankItem[];
  initialRequests: BankRequest[];
  characters: CharacterOpt[];
  scoresBankPoints: boolean;
}) {
  const [tab, setTab] = useState<Tab>("deposit");
  const [items, setItems] = useState(catalog);
  const [rows, setRows] = useState(initialRequests);
  const [picked, setPicked] = useState<PickedItem | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [materialGrade, setMaterialGrade] = useState<MaterialGrade>("bronze");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [character, setCharacter] = useState(
    characters.find((c) => c.is_main)?.name
      ? `${characters.find((c) => c.is_main)!.name}::${characters.find((c) => c.is_main)!.realm}`
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const qty = Math.max(1, Number(quantity) || 1);
  const depositItem = items.find((item) => item.id === depositId);
  const catalogHit =
    tab === "deposit"
      ? depositItem
      : picked
        ? catalogMatch(items, picked.blizzard_item_id, materialGrade)
        : undefined;
  const lotSize = catalogHit?.lot_size ?? 1;
  const estimate = catalogHit && tab === "deposit" ? pointsForQuantity(catalogHit.points, qty, lotSize) : null;
  const leftover = catalogHit && lotSize > 1 ? qty % lotSize : 0;
  const depositFree =
    depositItem?.remaining == null
      ? 5000
      : Math.max(0, depositItem.remaining - depositItem.pending_deposit_qty);
  const depositMax = depositItem ? Math.max(depositFree, 1) : 5000;

  async function reload() {
    const [catRes, reqRes] = await Promise.all([
      fetch("/api/bank/items"),
      fetch("/api/bank/requests/mine"),
    ]);
    const cat = await catRes.json().catch(() => []);
    const req = await reqRes.json().catch(() => []);
    if (catRes.ok && Array.isArray(cat)) setItems(cat);
    if (reqRes.ok && Array.isArray(req)) setRows(req);
  }

  async function submit(kind: "deposit" | "withdrawal") {
    if (kind === "deposit") {
      if (!depositItem) {
        setError("Elige un material publicado");
        return;
      }
      if (depositFree <= 0) {
        setError("Lo pendiente de validar ya cubre el cupo");
        return;
      }
      if (qty > depositFree) {
        setError(`Con lo que ya está pendiente, solo se pueden registrar ${depositFree}`);
        return;
      }
    } else if (!picked) {
      setError("Elige un objeto");
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    const [character_name, character_realm] = character.includes("::")
      ? character.split("::")
      : [undefined, undefined];
    const path = kind === "deposit" ? "/api/bank/deposits" : "/api/bank/withdrawals";
    const source =
      kind === "deposit" && depositItem
        ? {
            blizzard_item_id: depositItem.blizzard_item_id,
            name: depositItem.name,
            quality: depositItem.quality,
            material_grade: depositItem.material_grade,
            icon_url: depositItem.icon_url,
            description: depositItem.description,
            crafting_label: depositItem.crafting_label,
          }
        : {
            blizzard_item_id: picked!.blizzard_item_id,
            name: picked!.name,
            quality: picked!.quality,
            material_grade: materialGrade,
            icon_url: picked!.icon_url,
            description: picked!.description,
            crafting_label: picked!.crafting_label,
          };
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...source,
        quantity: qty,
        note: note.trim() || null,
        character_name: character_name || null,
        character_realm: character_realm || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(apiDetail(data, "No se pudo registrar"));
      return;
    }
    setPicked(null);
    setDepositId(null);
    setQuantity("1");
    setNote("");
    setOk(kind === "deposit" ? "Ingreso registrado. Pendiente de validación." : "Retirada solicitada.");
    setTab("history");
    await reload();
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/bank/requests/${id}/cancel`, { method: "POST" });
    if (res.ok) await reload();
  }

  const tabs = useMemo(
    () =>
      [
        { id: "deposit" as const, label: "Ingresar" },
        { id: "withdrawal" as const, label: "Pedir" },
        { id: "history" as const, label: "Historial" },
      ],
    [],
  );

  function onSubmit(kind: "deposit" | "withdrawal") {
    return (e: FormEvent) => {
      e.preventDefault();
      void submit(kind);
    };
  }

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setError(null);
              setOk(null);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "history" && (
        <form onSubmit={onSubmit(tab)} className="max-w-xl space-y-4">
          {tab === "deposit" ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Materiales publicados</p>
              {items.length === 0 && (
                <p className="text-sm text-gray-500">
                  Todavía no hay materiales publicados. Cuando un administrador los habilite, aparecerán aquí.
                </p>
              )}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const selected = depositId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDepositId(item.id);
                          setQuantity("1");
                        }}
                        className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${
                          selected
                            ? "border-yellow-400 bg-yellow-500/10"
                            : "border-gray-800 bg-gray-900 hover:border-gray-600"
                        }`}
                      >
                        {item.icon_url ? (
                          <img src={item.icon_url} alt="" className="w-8 h-8 rounded" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-800" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm truncate ${qualityClass(item.quality)}`}>
                            {item.name}
                            {item.material_grade !== "none" ? (
                              <>
                                {" · "}
                                <GradeBadge grade={item.material_grade} />
                              </>
                            ) : null}
                          </span>
                          <span className="block text-[11px] text-gray-500">
                            {rateLabel(item.points, item.lot_size)} · {stockLabel(item)}
                            {item.pending_deposit_qty > 0 ? ` · ${item.pending_deposit_qty} en validación` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <>
              <ItemPicker
                catalog={items}
                value={picked}
                onChange={(item) => {
                  setPicked(item);
                  if (item?.material_grade) setMaterialGrade(item.material_grade);
                  else if (item?.crafting_label) setMaterialGrade("bronze");
                }}
              />
              <GradeSelect value={materialGrade} onChange={setMaterialGrade} />
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-400">
              Cantidad
              <NumberField
                min={1}
                max={tab === "deposit" ? depositMax : 5000}
                value={quantity}
                onChange={setQuantity}
              />
            </label>
            {characters.length > 0 && (
              <label className="block text-sm text-gray-400">
                Personaje (opcional)
                <select
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  className="elune-select mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
                >
                  <option value="">—</option>
                  {characters.map((c) => (
                    <option key={`${c.name}-${c.realm}`} value={`${c.name}::${c.realm}`}>
                      {c.name}-{c.realm}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
          {tab === "deposit" && (
            <p className="text-sm text-gray-400">
              {!depositItem ? (
                "Elige un material publicado."
              ) : !scoresBankPoints ? (
                <>
                  Con tu itinerario este ingreso no suma puntos.
                  {depositItem.remaining == null
                    ? " No hay cupo."
                    : ` Si se acepta, el cupo baja en ${qty}.`}
                </>
              ) : (
                <>
                  Si se acepta: <span className="text-yellow-400 font-medium">{estimate} pts</span>
                  {lotSize > 1 ? ` · ${rateLabel(depositItem.points, lotSize)}` : ""}
                  {leftover ? ` (${leftover} no llegan a lote)` : ""}
                  {depositItem.remaining == null ? ". Sin cupo." : `. El cupo baja en ${qty}.`}
                </>
              )}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {ok && <p className="text-sm text-emerald-400">{ok}</p>}
          <button
            type="submit"
            disabled={busy || (tab === "deposit" ? !depositItem || depositFree <= 0 : !picked)}
            className="px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Enviando…" : tab === "deposit" ? "Registrar ingreso" : "Solicitar retirada"}
          </button>
        </form>
      )}

      {tab === "history" && (
        <ul className="space-y-3">
          {rows.length === 0 && <p className="text-gray-500">Aún no hay movimientos.</p>}
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex gap-3 items-start"
            >
              {row.item_icon_url ? (
                <img src={row.item_icon_url} alt="" className="w-10 h-10 rounded" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${qualityClass(row.item_quality)}`}>
                  {row.quantity}× {row.item_name}
                  {row.material_grade && row.material_grade !== "none" ? (
                    <>
                      {" · "}
                      <GradeBadge grade={row.material_grade} />
                    </>
                  ) : null}
                </p>
                <ItemFlavor craftingLabel={row.crafting_label} description={row.item_description} />
                <p className="text-xs text-gray-400 mt-0.5">
                  {KIND_LABEL[row.kind]} · {STATUS_LABEL[row.status]} · {fmtWhen(row.created_at)}
                  {row.character_name ? ` · ${row.character_name}` : ""}
                </p>
                {row.kind === "deposit" && row.status === "pending" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {row.scores_points
                      ? `Estimado ${row.current_points ?? row.estimated_points ?? 0} pts${
                          row.lot_size > 1 ? ` · lotes de ${row.lot_size}` : ""
                        }`
                      : "Sin puntos de campaña"}
                  </p>
                )}
                {row.status === "approved" && row.kind === "deposit" && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {row.awarded_points ? `+${row.awarded_points} pts` : "Validado sin puntos"}
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
      )}
    </div>
  );
}
