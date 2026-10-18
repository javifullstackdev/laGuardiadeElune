"use client";

import { useMemo, useState } from "react";

import { qualityClass } from "@/lib/bank";
import CraftItemPicker, { type CraftHit } from "./CraftItemPicker";

export type CraftOrder = {
  id: string;
  profession_id: number;
  profession_name: string;
  item_name: string;
  item_quality: string | null;
  item_icon_url: string | null;
  item_description: string | null;
  item_detail: string | null;
  quantity: number;
  note: string | null;
  status: "open" | "claimed" | "completed" | "cancelled";
  requester_id: string;
  requester_name: string;
  crafter_user_id: string | null;
  crafter_name: string | null;
  crafter_character_name: string | null;
  crafter_character_realm: string | null;
  awarded_points: number | null;
  admin_note: string | null;
  created_at: string | null;
};

export type Crafter = {
  profession_id: number;
  profession_name: string;
  character_name: string;
  character_realm: string;
  owner_id: string;
  owner_name: string;
  skill_points: number;
  max_skill_points: number;
  tier_name: string | null;
  high_skill: boolean;
  scores_points: boolean;
  path: string | null;
};

export type MyCharacter = { name: string; realm: string; is_main: boolean };

const STATUS: Record<CraftOrder["status"], string> = {
  open: "Abierto",
  claimed: "En fabricación",
  completed: "Entregado",
  cancelled: "Cancelado",
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

export default function PedidosClient({
  professions,
  initialOrders,
  crafters,
  characters,
  userId,
  isStaff,
  blizzardLinked,
  blizzardExpired,
}: {
  professions: { id: number; name: string }[];
  initialOrders: CraftOrder[];
  crafters: Crafter[];
  characters: MyCharacter[];
  userId: string;
  isStaff: boolean;
  blizzardLinked: boolean;
  blizzardExpired: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [professionId, setProfessionId] = useState(professions[0]?.id ?? 164);
  const [picked, setPicked] = useState<CraftHit | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [staffNote, setStaffNote] = useState<Record<string, string>>({});
  const [claimChar, setClaimChar] = useState<Record<string, string>>({});

  const board = useMemo(
    () => crafters.filter((row) => row.profession_id === professionId),
    [crafters, professionId],
  );

  const mineFor = (id: number) =>
    crafters.filter((row) => row.owner_id === userId && row.profession_id === id);

  async function reload() {
    const res = await fetch("/api/pedidos");
    const data = await res.json().catch(() => []);
    if (res.ok && Array.isArray(data)) setOrders(data);
  }

  async function createOrder() {
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profession_id: professionId,
        item_name: picked?.name ?? "",
        blizzard_item_id: picked?.id ?? null,
        item_quality: picked?.quality ?? null,
        item_icon_url: picked?.icon_url ?? null,
        item_description: picked?.description ?? null,
        item_detail: picked?.detail ?? null,
        quantity: Math.max(1, Math.min(20, Number(quantity) || 1)),
        note: note.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(detail(data, "No se pudo crear el pedido"));
      return;
    }
    setPicked(null);
    setQuantity("1");
    setNote("");
    setOk("Pedido publicado.");
    await reload();
  }

  async function act(id: string, action: string, body?: object) {
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch(`/api/pedidos/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(detail(data, "No se pudo actualizar el pedido"));
      return;
    }
    await reload();
  }

  const open = orders.filter((row) => row.status === "open" || row.status === "claimed");
  const closed = orders.filter((row) => row.status === "completed" || row.status === "cancelled");

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Nuevo pedido</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm text-gray-400">
            Profesión
            <select
              value={professionId}
              onChange={(e) => {
                setProfessionId(Number(e.target.value));
                setPicked(null);
              }}
              className="elune-select mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            >
              {professions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-gray-400">
            Cantidad
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            />
          </label>
        </div>
        <div className="text-sm text-gray-400">
          Qué necesitas
          <div className="mt-1">
            <CraftItemPicker
              key={professionId}
              professionId={professionId}
              value={picked}
              onChange={setPicked}
            />
          </div>
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        {ok && <p className="text-sm text-emerald-400">{ok}</p>}
        <button
          type="button"
          disabled={busy || !picked}
          onClick={createOrder}
          className="px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
        >
          Publicar pedido
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">
          Artesanos de {professions.find((row) => row.id === professionId)?.name}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Sale de Battle.net, del tramo de la expansión actual. Un nivel alto está en el 75 % de
          ese tramo o por encima de 75 puntos. Si no apareces, vincula de nuevo Battle.net en el
          perfil: el enlace caduca al día.
        </p>
        {board.length === 0 ? (
          <p className="text-sm text-gray-400">
            {blizzardExpired
              ? "Tu enlace con Battle.net ha caducado. Vuelve a vincularlo en el perfil y recarga Pedidos: leemos las profesiones de los personajes con el enlace vigente."
              : blizzardLinked
                ? "Nadie con el enlace vigente tiene esta profesión."
                : "Vincula Battle.net en el perfil para que tus personajes salgan aquí. El resto aparece mientras su enlace siga vigente."}
          </p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {board.map((row) => (
              <li
                key={`${row.character_name}-${row.character_realm}-${row.profession_id}`}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{row.character_name}</span>
                    <span className="text-gray-500">-{row.character_realm}</span>
                    <span className="text-gray-400"> · {row.owner_name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.tier_name ? `${row.tier_name} · ` : ""}
                    {row.skill_points}/{row.max_skill_points || "—"}
                    {row.high_skill ? " · nivel alto" : ""}
                    {row.scores_points ? "" : " · fabrica sin puntos de campaña"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pedidos en curso</h2>
        {open.length === 0 && <p className="text-sm text-gray-400">No hay pedidos abiertos.</p>}
        {open.map((row) => {
          const options = mineFor(row.profession_id);
          const selected =
            claimChar[row.id] ||
            (options[0] ? `${options[0].character_name}::${options[0].character_realm}` : "");
          return (
            <article key={row.id} className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-medium flex items-start gap-3 min-w-0">
                  {row.item_icon_url ? (
                    <img src={row.item_icon_url} alt="" className="w-9 h-9 rounded" />
                  ) : null}
                  <span className="min-w-0">
                    <span className={`block ${qualityClass(row.item_quality)}`}>
                      {row.quantity}× {row.item_name}
                    </span>
                    {row.item_detail && (
                      <span className="block text-xs text-yellow-200/70 font-normal">{row.item_detail}</span>
                    )}
                    {row.item_description && (
                      <span className="block text-xs text-gray-400 italic font-normal mt-0.5">
                        “{row.item_description}”
                      </span>
                    )}
                  </span>
                </h3>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {STATUS[row.status]} · {row.profession_name}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Pedido por {row.requester_name}
                {row.created_at ? ` · ${when(row.created_at)}` : ""}
              </p>
              {row.note && <p className="text-sm text-gray-300">{row.note}</p>}
              {row.status === "claimed" && (
                <p className="text-sm text-gray-300">
                  Lo fabrica {row.crafter_character_name}
                  {row.crafter_character_realm ? `-${row.crafter_character_realm}` : ""}
                  {row.crafter_name ? ` (${row.crafter_name})` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 items-end">
                {row.status === "open" && row.requester_id !== userId && (
                  options.length > 0 ? (
                    <>
                      <label className="text-sm text-gray-400">
                        Con
                        <select
                          value={selected}
                          onChange={(e) => setClaimChar((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          className="elune-select mt-1 block bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          {options.map((opt) => (
                            <option
                              key={`${opt.character_name}-${opt.character_realm}`}
                              value={`${opt.character_name}::${opt.character_realm}`}
                            >
                              {opt.character_name}-{opt.character_realm} ({opt.skill_points})
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={busy || !selected}
                        onClick={() => {
                          const [character_name, character_realm] = selected.split("::");
                          void act(row.id, "claim", { character_name, character_realm });
                        }}
                        className="px-3 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
                      >
                        Lo fabrico yo
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Para cogerlo, abre la pestaña Profesiones del personaje que tenga{" "}
                      {row.profession_name}.
                      {characters.length === 0 ? " Primero vincula un personaje." : ""}
                    </p>
                  )
                )}
                {row.status === "claimed" && row.crafter_user_id === userId && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(row.id, "release")}
                    className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-200"
                  >
                    Soltar pedido
                  </button>
                )}
                {(row.requester_id === userId || isStaff) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(row.id, "cancel")}
                    className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-400"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              {isStaff && row.status === "claimed" && (
                <div className="grid sm:grid-cols-[8rem_1fr_auto] gap-2 items-end pt-1">
                  <label className="text-sm text-gray-400">
                    Puntos
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      value={points[row.id] ?? ""}
                      onChange={(e) => setPoints((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="text-sm text-gray-400">
                    Nota de entrega
                    <input
                      value={staffNote[row.id] ?? ""}
                      onChange={(e) => setStaffNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || points[row.id] === undefined || points[row.id] === ""}
                    onClick={() =>
                      void act(row.id, "complete", {
                        amount: Math.max(0, Number(points[row.id]) || 0),
                        note: (staffNote[row.id] || "").trim() || null,
                      })
                    }
                    className="px-3 py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-black text-sm font-medium disabled:opacity-50"
                  >
                    Entregar
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {closed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Cerrados</h2>
          {closed.slice(0, 20).map((row) => (
            <p key={row.id} className="text-sm text-gray-400">
              {STATUS[row.status]} · {row.quantity}× {row.item_name} ({row.profession_name})
              {row.awarded_points != null && row.status === "completed"
                ? ` · ${row.awarded_points} pts`
                : ""}
              {row.admin_note ? ` · ${row.admin_note}` : ""}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
