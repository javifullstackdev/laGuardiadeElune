"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankItem = {
  target_type: string;
  target_type_label: string;
  target_id: string;
  like_count: number;
  title: string;
  subtitle: string | null;
  href: string | null;
  meta: string | null;
};

type Liker = {
  like_id: string;
  liked_at: string | null;
  username: string;
  discord_id: string;
  avatar_url: string | null;
  role: string | null;
  guild_title: string;
  account_created_at: string | null;
  has_blizzard: boolean;
  character_count: number;
  is_deleted: boolean;
};

type Detail = {
  target_type: string;
  target_type_label: string;
  target_id: string;
  like_count: number;
  target: RankItem | null;
  likers: Liker[];
};

const TABS: { key: string; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "post", label: "Posts" },
  { key: "story", label: "Historias" },
  { key: "character", label: "Fichas" },
];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function accountAgeDays(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default function LikesPanel({ initial }: { initial: RankItem[] }) {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const qs = tab === "all" ? "" : `?target_type=${tab}`;
      const res = await fetch(`/api/admin/likes/ranking${qs}`);
      const data = await res.json();
      if (!cancelled && res.ok) setItems(data);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function openDetail(item: RankItem) {
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(
      `/api/admin/likes/target/${encodeURIComponent(item.target_type)}/${encodeURIComponent(item.target_id)}`
    );
    const data = await res.json();
    if (res.ok) setDetail(data);
    setDetailLoading(false);
  }

  async function removeLike(likeId: string) {
    if (!confirm("¿Quitar este like?")) return;
    setRemoving(likeId);
    const res = await fetch(`/api/admin/likes/${likeId}`, { method: "DELETE" });
    setRemoving(null);
    if (res.ok || res.status === 204) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              like_count: Math.max(0, prev.like_count - 1),
              likers: prev.likers.filter((l) => l.like_id !== likeId),
            }
          : prev
      );
      setItems((prev) =>
        prev
          .map((i) =>
            detail && i.target_id === detail.target_id && i.target_type === detail.target_type
              ? { ...i, like_count: Math.max(0, i.like_count - 1) }
              : i
          )
          .filter((i) => i.like_count > 0)
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setDetail(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              tab === t.key
                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        Solo pueden dar like cuentas logueadas con Discord (una vez por publicación; pueden
        quitarlo). Usa el detalle para revisar Discord ID, antigüedad y Battle.net.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
          <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">Ranking por likes</h2>
            {loading && <span className="text-xs text-gray-500">Cargando…</span>}
          </header>
          {items.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">Aún no hay likes en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-gray-800/80 max-h-[32rem] overflow-y-auto">
              {items.map((item, idx) => (
                <li key={`${item.target_type}-${item.target_id}`}>
                  <button
                    type="button"
                    onClick={() => openDetail(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-800/60 transition-colors ${
                      detail?.target_id === item.target_id &&
                      detail?.target_type === item.target_type
                        ? "bg-gray-800/80"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-yellow-400/90 font-bold tabular-nums w-7 shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-100 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.target_type_label}
                          {item.subtitle ? ` · ${item.subtitle}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-yellow-400 tabular-nums">
                        {item.like_count}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden min-h-[20rem]">
          <header className="px-4 py-3 border-b border-gray-800">
            <h2 className="font-semibold">Quién ha dado like</h2>
          </header>
          {detailLoading ? (
            <p className="p-6 text-gray-500 text-sm">Cargando…</p>
          ) : !detail ? (
            <p className="p-6 text-gray-500 text-sm">
              Selecciona un contenido del ranking para ver los likes.
            </p>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {detail.target_type_label} · {detail.like_count} likes
                </p>
                <p className="font-semibold text-lg mt-0.5">
                  {detail.target?.title ?? "(sin título)"}
                </p>
                {detail.target?.href && (
                  <Link
                    href={detail.target.href}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                    target="_blank"
                  >
                    Abrir contenido →
                  </Link>
                )}
              </div>

              {detail.likers.length === 0 ? (
                <p className="text-sm text-gray-500">Nadie ha dado like.</p>
              ) : (
                <ul className="space-y-3 max-h-[26rem] overflow-y-auto">
                  {detail.likers.map((l) => {
                    const age = accountAgeDays(l.account_created_at);
                    const suspicious =
                      l.is_deleted ||
                      (age !== null && age < 3) ||
                      (!l.has_blizzard && l.character_count === 0);
                    return (
                      <li
                        key={l.like_id}
                        className={`rounded-lg border px-3 py-2.5 ${
                          suspicious
                            ? "border-amber-500/40 bg-amber-500/5"
                            : "border-gray-800 bg-black/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {l.avatar_url ? (
                            <img
                              src={l.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                              {l.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {l.username}
                              {l.is_deleted && (
                                <span className="ml-2 text-[10px] text-red-400">borrado</span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Discord {l.discord_id}
                              {l.role ? ` · ${l.role}` : ""}
                              {l.guild_title ? ` · ${l.guild_title}` : ""}
                            </p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              Like: {fmtDate(l.liked_at)}
                              {" · "}
                              Cuenta: {age !== null ? `${age}d` : "—"}
                              {" · "}
                              {l.has_blizzard ? "Bnet" : "sin Bnet"}
                              {" · "}
                              {l.character_count} pers.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={removing === l.like_id}
                            onClick={() => removeLike(l.like_id)}
                            className="text-[11px] text-red-400/80 hover:text-red-300 shrink-0"
                          >
                            {removing === l.like_id ? "…" : "Quitar"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
