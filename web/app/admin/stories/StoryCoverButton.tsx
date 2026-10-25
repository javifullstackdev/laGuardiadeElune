"use client";

import { useState } from "react";

export default function StoryCoverButton({
  storyId,
  coverUrl,
}: {
  storyId: string;
  coverUrl: string | null;
}) {
  const [url, setUrl] = useState(coverUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("cover", file);
    const res = await fetch(`/api/admin/stories/${storyId}/cover`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo cambiar la imagen.");
      return;
    }
    if (typeof data.cover_url === "string") setUrl(data.cover_url);
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      {url ? (
        <img
          src={url}
          alt=""
          className="w-14 h-16 rounded-lg object-cover object-top border border-gray-800"
        />
      ) : (
        <div className="w-14 h-16 rounded-lg bg-gray-800 border border-gray-700" />
      )}
      <div className="flex flex-col items-end gap-1">
        <label className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 cursor-pointer">
          {busy ? "..." : "Cambiar imagen"}
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
        {error && <p className="text-[11px] text-red-400 max-w-[9rem] text-right">{error}</p>}
      </div>
    </div>
  );
}
