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
  const catalogHit = picked ? catalogMatch(items, picked.blizzard_item_id, materialGrade) : undefined;
  const lotSize = catalogHit?.lot_size ?? 1;
  const estimate = catalogHit ? pointsForQuantity(catalogHit.points, qty, lotSize) : null;
  const leftover = catalogHit && lotSize > 1 ? qty % lotSize : 0;

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
    if (!picked) {
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
    const res = await fetch(path, {
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
          <ItemPicker
            catalog={items}
            value={picked}
            onChange={(item) => {
              setPicked(item);
              if (item?.material_grade) setMaterialGrade(item.material_grade);
              else if (item?.crafting_label) setMaterialGrade("bronze");
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <GradeSelect value={materialGrade} onChange={setMaterialGrade} />
            <label className="block text-sm text-gray-400">
              Cantidad
              <NumberField min={1} max={5000} value={quantity} onChange={setQuantity} />
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
              {!scoresBankPoints ? (
                "Solo Campaña e Híbrido suman puntos por ingresos. Competitivo puede aportar, sin puntos."
              ) : estimate != null ? (
                <>
                  Estimado: <span className="text-yellow-400 font-medium">{estimate} pts</span>
                  {lotSize > 1 ? ` · ${rateLabel(catalogHit!.points, lotSize)}` : ""}
                  {leftover ? ` (${leftover} no llegan a lote)` : ""}
                  . Puede cambiar al validar.
                </>
              ) : (
                "Este objeto aún no tiene puntos en el catálogo; el admin los fijará al validar."
              )}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {ok && <p className="text-sm text-emerald-400">{ok}</p>}
          <button
            type="submit"
            disabled={busy || !picked}
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
