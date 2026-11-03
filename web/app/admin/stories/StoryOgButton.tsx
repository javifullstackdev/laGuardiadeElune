"use client";

import { useState } from "react";

export default function StoryOgButton({
  storyId,
  ogImageUrl,
}: {
  storyId: string;
  ogImageUrl: string | null;
}) {
  const [url, setUrl] = useState(ogImageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("image", file);
    const res = await fetch(`/api/admin/stories/${storyId}/og-image`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo guardar la imagen.");
      return;
    }
    if (typeof data.og_image_url === "string") setUrl(data.og_image_url);
  }

  async function clear() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/stories/${storyId}/og-image`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.detail === "string" ? data.detail : "No se pudo quitar la imagen.");
      return;
    }
    setUrl(null);
  }

  return (
    <div className="flex items-center gap-3">
      {url ? (
        <img
          src={url}
          alt=""
          className="w-24 h-14 rounded-lg object-cover border border-gray-800"
        />
      ) : (
        <div className="w-24 h-14 rounded-lg bg-gray-800 border border-gray-700" />
      )}
      <div className="flex flex-col items-start gap-1">
        <label className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 cursor-pointer">
          {busy ? "..." : url ? "Cambiar al compartir" : "Imagen al compartir"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void onFile(file);
            }}
          />
        </label>
        <p className="text-[11px] text-gray-500">WhatsApp y X. Horizontal, 1200×630.</p>
        {url ? (
          <button
            type="button"
            onClick={() => void clear()}
            disabled={busy}
            className="text-[11px] text-gray-400 hover:text-gray-200 disabled:opacity-50"
          >
            Quitar
          </button>
        ) : null}
        {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
