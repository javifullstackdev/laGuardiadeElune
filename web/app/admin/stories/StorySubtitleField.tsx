"use client";

import { useState } from "react";

export default function StorySubtitleField({
  storyId,
  subtitle,
}: {
  storyId: string;
  subtitle: string | null;
}) {
  const [value, setValue] = useState(subtitle ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/admin/stories/${storyId}/subtitle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitle: value.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.detail === "string" ? data.detail : "No se pudo guardar.");
      return;
    }
    setNote("Guardado");
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Subtítulo, por ejemplo Capítulo I"
        maxLength={80}
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
  );
}
