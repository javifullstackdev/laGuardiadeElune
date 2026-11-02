"use client";

import { useState } from "react";

export default function StoryBodyField({
  storyId,
  biography,
  personality,
  appearance,
}: {
  storyId: string;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(biography ?? "");
  const [pers, setPers] = useState(personality ?? "");
  const [look, setLook] = useState(appearance ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    if (bio.trim().length < 80) {
      setNote("La historia es demasiado corta.");
      return;
    }
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/admin/stories/${storyId}/body`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        biography: bio,
        personality: pers.trim() ? pers : null,
        appearance: look.trim() ? look : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setNote(typeof data.detail === "string" ? data.detail : "No se pudo guardar.");
      return;
    }
    if (typeof data.biography === "string") setBio(data.biography);
    setPers(typeof data.personality === "string" ? data.personality : "");
    setLook(typeof data.appearance === "string" ? data.appearance : "");
    setNote("Guardado");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-200"
      >
        {open ? "Cerrar texto" : "Editar texto"}
      </button>
      {open ? (
        <div className="space-y-2">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={12}
            aria-label="Texto"
            placeholder="Texto de la historia"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600"
          />
          <textarea
            value={pers}
            onChange={(e) => setPers(e.target.value)}
            rows={3}
            aria-label="Personalidad"
            placeholder="Personalidad, si esta historia la tiene"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
          />
          <textarea
            value={look}
            onChange={(e) => setLook(e.target.value)}
            rows={3}
            aria-label="Aspecto físico"
            placeholder="Aspecto físico, si esta historia lo tiene"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-200 disabled:opacity-50"
            >
              {busy ? "..." : "Guardar texto"}
            </button>
            {note ? <span className="text-[11px] text-gray-400">{note}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
