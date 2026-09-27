"use client";

import { useEffect, useRef, useState } from "react";

type LikeState = {
  count: number;
  liked: boolean;
};

export default function ShareBar({
  targetType,
  targetId,
  title,
  loggedIn,
  variant = "bar",
}: {
  targetType: "post" | "story";
  targetId: string;
  title: string;
  loggedIn: boolean;
  variant?: "bar" | "parchment";
}) {
  const [likes, setLikes] = useState<LikeState>({ count: 0, liked: false });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ target_type: targetType, target_id: targetId });
    fetch(`/api/likes?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setLikes({ count: d.count, liked: d.liked });
      });
  }, [targetType, targetId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggleLike() {
    if (!loggedIn || busy) return;
    setBusy(true);
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
    const data = await res.json();
    if (res.ok) setLikes({ count: data.count, liked: data.liked });
    setBusy(false);
  }

  const text = `${title} — La Guardia de Elune`;
  const wa = url ? `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` : "#";
  const x = url
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    : "#";

  async function copyForInstagram() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (variant === "parchment") {
    const btn =
      "inline-flex items-center h-7 px-2 rounded-sm text-[11px] font-semibold tracking-wide text-[#2a1c10] border border-[#4a3424]/25 hover:bg-[#2a1c10]/8 transition-colors";
    const item =
      "block w-full text-left px-3 py-1.5 text-[12px] text-[#2a1c10] hover:bg-[#2a1c10]/8";
    return (
      <div className="flex items-center gap-1.5">
        {loggedIn ? (
          <button type="button" onClick={toggleLike} disabled={busy} className={btn}>
            {likes.liked ? "Te gusta" : "Me gusta"} · {likes.count}
          </button>
        ) : (
          <a href="http://localhost:8000/auth/discord/login" className={btn}>
            Me gusta · {likes.count}
          </a>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={btn}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            Compartir
          </button>
          {open && (
            <div
              role="menu"
              className="absolute bottom-full left-0 mb-1.5 min-w-[9.5rem] rounded-md bg-[#f4ead2] border border-[#4a3424]/20 shadow-[0_8px_20px_rgba(0,0,0,0.28)] py-1 z-20"
            >
              <a href={wa} target="_blank" rel="noreferrer" role="menuitem" className={item} onClick={() => setOpen(false)}>
                WhatsApp
              </a>
              <a href={x} target="_blank" rel="noreferrer" role="menuitem" className={item} onClick={() => setOpen(false)}>
                X
              </a>
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  copyForInstagram();
                }}
              >
                {copied ? "Enlace copiado" : "Instagram"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-8 mt-8 border-t border-gray-800">
      {loggedIn ? (
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            likes.liked
              ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : "bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600"
          }`}
        >
          {likes.liked ? "Te gusta" : "Me gusta"} · {likes.count}
        </button>
      ) : (
        <a
          href="http://localhost:8000/auth/discord/login"
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-900 text-gray-300 border border-gray-800 hover:border-gray-600"
        >
          Entrar para dar like · {likes.count}
        </a>
      )}
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 rounded-lg text-sm bg-gray-900 text-gray-300 border border-gray-800 hover:border-gray-600"
      >
        WhatsApp
      </a>
      <a
        href={x}
        target="_blank"
        rel="noreferrer"
        className="px-3 py-1.5 rounded-lg text-sm bg-gray-900 text-gray-300 border border-gray-800 hover:border-gray-600"
      >
        X
      </a>
      <button
        type="button"
        onClick={copyForInstagram}
        className="px-3 py-1.5 rounded-lg text-sm bg-gray-900 text-gray-300 border border-gray-800 hover:border-gray-600"
      >
        {copied ? "Enlace copiado" : "Instagram (copiar enlace)"}
      </button>
    </div>
  );
}
