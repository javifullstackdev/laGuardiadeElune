"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CraftCharacter = { name: string; realm: string; skill_points: number };

type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  claim_id: string | null;
  claim_status: string | null;
  craft_order_id: string | null;
  craft_status: string | null;
  characters: CraftCharacter[];
  read: boolean;
  created_at: string;
};

type Payload = {
  unread: number;
  items: Notice[];
};

const KIND_LABEL: Record<string, string> = {
  points_mythic: "Mítica",
  points_bank: "Banco",
  points_craft: "Artesanía",
  craft_claimed: "Pedido",
  craft_done: "Pedido",
  craft_offer: "Pedido",
  craft_published: "Pedido",
  craft_accepted: "Pedido",
  craft_ready: "Pedido",
  craft_collected: "Pedido",
  craft_cancelled: "Pedido",
  eremita_story: "Eremita",
  eremita_bio: "Eremita",
  relation_claim: "Mención",
};

function MailboxIcon({ unread, open }: { unread: boolean; open: boolean }) {
  const state = `${unread ? "has-unread" : ""} ${open ? "is-open" : ""}`.trim();
  return (
    <svg
      viewBox="0 0 32 32"
      className={`mailbox-icon w-5 h-5 shrink-0 overflow-visible ${state}`}
      aria-hidden="true"
    >
      <g className="letter">
        <rect x="9" y="9" width="14" height="9" rx="1" fill="#f3e2a4" />
        <path d="M10 11.2h8M10 13.4h5" stroke="#8a7040" strokeWidth="0.7" strokeLinecap="round" />
      </g>
      <path
        d="M6.5 13.5h19v11.2a1.6 1.6 0 0 1-1.6 1.6H8.1a1.6 1.6 0 0 1-1.6-1.6V13.5z"
        fill="#14120c"
        stroke="#e4c56a"
        strokeWidth="1.2"
      />
      <path d="M7 14.2 L16 21.2 L25 14.2" fill="none" stroke="#e4c56a" strokeWidth="0.8" opacity="0.55" />
      <path
        className="flap"
        d="M6.5 13.6 L16 21.4 L25.5 13.6"
        fill="#1c1810"
        stroke="#e4c56a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        className="seal"
        d="M16 16.2a2.5 2.5 0 1 0 0 5 2.1 2.1 0 1 1 0-5z"
        fill="#f6e7a8"
      />
    </svg>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function Mailbox({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notice[]>([]);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [crafter, setCrafter] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : { unread: 0, items: [] }))
      .then((data: Payload) => {
        setUnread(data.unread ?? 0);
        setItems(data.items ?? []);
      })
      .catch(() => {});
  }, []);

  async function openBox() {
    setOpen(true);
    const current = await fetch("/api/notifications");
    const before: Payload = current.ok ? await current.json() : { unread: 0, items: [] };
    const fresh = before.items ?? [];
    setItems(fresh);
    setHighlight(new Set(fresh.filter((item) => !item.read).map((item) => item.id)));
    const res = await fetch("/api/notifications/seen", { method: "POST" });
    if (!res.ok) return;
    const data: Payload = await res.json();
    setUnread(data.unread ?? 0);
    setItems(data.items ?? []);
    router.refresh();
  }

  async function refresh() {
    const fresh = await fetch("/api/notifications");
    if (!fresh.ok) return;
    const data: Payload = await fresh.json();
    setUnread(data.unread ?? 0);
    setItems(data.items ?? []);
    router.refresh();
  }

  async function acceptOrder(item: Notice) {
    const options = item.characters ?? [];
    const selected = crafter[item.id] || (options[0] ? `${options[0].name}::${options[0].realm}` : "");
    const [character_name, character_realm] = selected.split("::");
    if (!item.craft_order_id || !character_name || !character_realm) return;
    setBusy(item.id);
    setError(null);
    const res = await fetch(`/api/pedidos/${item.craft_order_id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_name, character_realm }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data && typeof data.detail === "string" ? data.detail : "No se pudo coger el pedido";
      setError(detail);
      setBusy(null);
      return;
    }
    await refresh();
    setBusy(null);
  }

  async function orderAction(item: Notice, action: "finish" | "collect" | "cancel") {
    if (!item.craft_order_id) return;
    setBusy(`${item.id}-${action}`);
    setError(null);
    const res = await fetch(`/api/pedidos/${item.craft_order_id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data && typeof data.detail === "string" ? data.detail : "No se pudo actualizar el pedido";
      setError(detail);
      setBusy(null);
      return;
    }
    await refresh();
    setBusy(null);
  }

  async function declineOrder(id: string) {
    setBusy(id);
    setError(null);
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await refresh();
    setBusy(null);
  }

  async function resolve(claimId: string, action: "confirm" | "reject") {
    setBusy(`${claimId}-${action}`);
    const res = await fetch(`/api/claims/${claimId}/${action}`, { method: "POST" });
    if (res.ok) {
      const fresh = await fetch("/api/notifications");
      if (fresh.ok) {
        const data: Payload = await fresh.json();
        setUnread(data.unread ?? 0);
        setItems(data.items ?? []);
      }
      router.refresh();
    }
    setBusy(null);
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            if (open) {
              setOpen(false);
              setHighlight(new Set());
              return;
            }
            openBox();
          }}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-800 bg-gray-950/60 text-sm text-gray-200 hover:border-gray-600 transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <MailboxIcon unread={unread > 0} open={open} />
            {open ? "Cerrar buzón" : "Buzón"}
          </span>
          {unread > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold inline-flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {open ? (
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-gray-500 px-1">
              Cuando sumes puntos, entre un pedido de tu profesión, el Eremita responda o te nombren en una historia, aparecerá aquí.
            </p>
          )}
          {error && <p className="text-xs text-red-400 px-1">{error}</p>}
          {items.map((item) => {
            const pending = item.kind === "relation_claim" && item.claim_status === "pending" && item.claim_id;
            const offer = item.kind === "craft_offer" && item.craft_status === "open" && item.craft_order_id;
            const crafting = item.kind === "craft_accepted" && item.craft_status === "claimed" && item.craft_order_id;
            const ready = item.kind === "craft_ready" && item.craft_status === "completed" && item.craft_order_id;
            const options = item.characters ?? [];
            const selected =
              crafter[item.id] || (options[0] ? `${options[0].name}::${options[0].realm}` : "");
            return (
              <article
                key={item.id}
                className={`rounded-lg border px-3 py-2.5 space-y-1 ${
                  pending || offer || crafting || ready
                    ? "border-amber-500/30 bg-amber-500/5"
                    : !item.read || highlight.has(item.id)
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-gray-800 bg-gray-950/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    {KIND_LABEL[item.kind] ?? "Aviso"}
                  </p>
                  <p className="text-[10px] text-gray-600 shrink-0">{formatWhen(item.created_at)}</p>
                </div>
                <p className="text-sm text-white leading-snug">{item.title}</p>
                {item.body && <p className="text-xs text-gray-400 leading-relaxed">{item.body}</p>}
                {item.href && (
                  <Link href={item.href} className="inline-block text-xs text-yellow-400 hover:text-yellow-300">
                    Ver
                  </Link>
                )}
                {offer && (
                  <div className="flex flex-wrap gap-2 pt-1 items-end">
                    {options.length > 1 && (
                      <select
                        value={selected}
                        onChange={(e) => setCrafter((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="elune-select bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-white"
                      >
                        {options.map((opt) => (
                          <option key={`${opt.name}-${opt.realm}`} value={`${opt.name}::${opt.realm}`}>
                            {opt.name} · nivel {opt.skill_points}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={!!busy || options.length === 0}
                      onClick={() => acceptOrder(item)}
                      className="px-2.5 py-1 rounded-md text-xs bg-yellow-500/90 hover:bg-yellow-400 text-black disabled:opacity-50"
                    >
                      Lo fabrico
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => declineOrder(item.id)}
                      className="px-2.5 py-1 rounded-md text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50"
                    >
                      Ahora no
                    </button>
                  </div>
                )}
                {crafting && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => orderAction(item, "finish")}
                      className="px-2.5 py-1 rounded-md text-xs bg-yellow-500/90 hover:bg-yellow-400 text-black disabled:opacity-50"
                    >
                      Lo he fabricado
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => orderAction(item, "cancel")}
                      className="px-2.5 py-1 rounded-md text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {ready && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => orderAction(item, "collect")}
                      className="px-2.5 py-1 rounded-md text-xs bg-yellow-500/90 hover:bg-yellow-400 text-black disabled:opacity-50"
                    >
                      Pedido recogido
                    </button>
                  </div>
                )}
                {pending && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => resolve(item.claim_id as string, "confirm")}
                      className="px-2.5 py-1 rounded-md text-xs bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => resolve(item.claim_id as string, "reject")}
                      className="px-2.5 py-1 rounded-md text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      )}
    </div>
  );
}
