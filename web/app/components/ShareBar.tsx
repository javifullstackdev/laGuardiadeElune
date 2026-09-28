"use client";

import { useEffect, useState, type ReactNode, type SVGProps } from "react";

type LikeState = {
  count: number;
  liked: boolean;
};

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      {children}
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Icon
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.85}
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </Icon>
  );
}

function XIcon() {
  return (
    <Icon fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.25 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Icon>
  );
}

function WhatsAppIcon() {
  return (
    <Icon fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.256 1.36.22 1.872.133.571-.096 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </Icon>
  );
}

function InstagramIcon() {
  return (
    <Icon fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 9.2 17 19 7" />
    </Icon>
  );
}

export default function ShareBar({
  targetType,
  targetId,
  title,
  loggedIn,
  variant = "bar",
  shareUrl,
}: {
  targetType: "post" | "story" | "character";
  targetId: string;
  title: string;
  loggedIn: boolean;
  variant?: "bar" | "parchment";
  shareUrl?: string;
}) {
  const [likes, setLikes] = useState<LikeState>({ count: 0, liked: false });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (shareUrl) {
      setUrl(shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`);
      return;
    }
    setUrl(window.location.href);
  }, [shareUrl]);

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
    const nextLiked = !likes.liked;
    setLikes({
      count: Math.max(0, likes.count + (nextLiked ? 1 : -1)),
      liked: nextLiked,
    });
    if (nextLiked) {
      setPop(true);
      window.setTimeout(() => setPop(false), 450);
    }
    setBusy(true);
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: targetId }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) setLikes({ count: data.count, liked: data.liked });
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

  const loginHref = "http://localhost:8000/auth/discord/login";

  if (variant === "parchment") {
    const iconBtn =
      "parchment-share-btn inline-flex items-center justify-center w-8 h-8 rounded-sm text-[1.28rem] leading-none";
    const likeBtn = `${iconBtn} min-w-8 w-auto gap-1 px-1`;
    const likeControl = (
      <>
        <HeartIcon filled={likes.liked} />
        {likes.count > 0 ? (
          <span className="text-[10px] font-semibold tabular-nums tracking-wide opacity-80">
            {likes.count}
          </span>
        ) : null}
      </>
    );

    return (
      <div className="flex items-center gap-1">
        {loggedIn ? (
          <button
            type="button"
            onClick={toggleLike}
            disabled={busy}
            className={`${likeBtn}${likes.liked ? " is-liked" : ""}${pop ? " parchment-heart-pop" : ""}`}
            aria-label={likes.liked ? "Quitar me gusta" : "Me gusta"}
            aria-pressed={likes.liked}
          >
            {likeControl}
          </button>
        ) : (
          <a href={loginHref} className={likeBtn} aria-label={`Me gusta · ${likes.count}`}>
            {likeControl}
          </a>
        )}
        <a
          href={x}
          target="_blank"
          rel="noreferrer"
          className={iconBtn}
          aria-label="Compartir en X"
        >
          <XIcon />
        </a>
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={iconBtn}
          aria-label="Compartir en WhatsApp"
        >
          <WhatsAppIcon />
        </a>
        <button
          type="button"
          onClick={copyForInstagram}
          className={iconBtn}
          aria-label={copied ? "Enlace copiado para Instagram" : "Copiar enlace para Instagram"}
          title={copied ? "Enlace copiado" : "Instagram"}
        >
          {copied ? <CheckIcon /> : <InstagramIcon />}
        </button>
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
          href={loginHref}
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
