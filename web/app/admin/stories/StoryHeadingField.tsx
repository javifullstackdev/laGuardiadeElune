"use client";

import { useState } from "react";
import Link from "next/link";

export default function StoryHeadingField({
  storyId,
  title,
  subtitle,
  href,
}: {
  storyId: string;
  title: string;
  subtitle: string | null;
  href: string;
}) {
  const [titleValue, setTitleValue] = useState(title);
  const [subtitleValue, setSubtitleValue] = useState(subtitle ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    const nextTitle = titleValue.trim();
    if (!nextTitle) {
      setNote("El título no puede estar vacío.");
      return;
    }
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/admin/stories/${storyId}/heading`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: nextTitle,
        subtitle: subtitleValue.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.detail === "string" ? data.detail : "No se pudo guardar.");
      return;
    }
    if (typeof data.title === "string") setTitleValue(data.title);
    setSubtitleValue(typeof data.subtitle === "string" ? data.subtitle : "");
    setNote("Guardado");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          placeholder="Título"
          maxLength={255}
          aria-label="Título"
          className="min-w-0 flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-sm text-gray-100 placeholder:text-gray-600"
        />
        <Link href={href} className="text-xs text-gray-500 hover:text-yellow-400 shrink-0">
          Ver
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={subtitleValue}
          onChange={(e) => setSubtitleValue(e.target.value)}
          placeholder="Subtítulo, por ejemplo Capítulo I"
          maxLength={80}
          aria-label="Subtítulo"
          className="min-w-0 flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-200 placeholder:text-gray-600"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-200 shrink-0 disabled:opacity-50"
        >
          {busy ? "..." : "Guardar"}
        </button>
        {note ? <span className="text-[11px] text-gray-400 shrink-0">{note}</span> : null}
      </div>
    </div>
  );
}
