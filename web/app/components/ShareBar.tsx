"use client";

import { useEffect, useState } from "react";

type LikeState = {
  count: number;
  liked: boolean;
};

export default function ShareBar({
  targetType,
  targetId,
  title,
  loggedIn,
}: {
  targetType: "post" | "story";
  targetId: string;
  title: string;
  loggedIn: boolean;
}) {
  const [likes, setLikes] = useState<LikeState>({ count: 0, liked: false });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ target_type: targetType, target_id: targetId });
    fetch(`/api/likes?${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setLikes({ count: d.count, liked: d.liked });
      });
  }, [targetType, targetId]);

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

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = `${title} — La Guardia de Elune`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  async function copyForInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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
