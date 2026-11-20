"use client";

import { useState } from "react";

export default function CharacterSurname({
  characterId,
  game,
  surname,
  allowed,
  onChange,
}: {
  characterId: string;
  game?: string;
  surname?: string | null;
  allowed?: boolean;
  onChange: (allowed: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = (surname ?? "").trim();
  if ((game ?? "retail") === "forever" || !text) return null;

  const shown = allowed !== false;

  async function decide(next: boolean) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/bios/${characterId}/surname`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowed: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo guardar el apellido.");
      return;
    }
    onChange(Boolean(data.surname_allowed));
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-gray-500">Apellido</p>
          <p className="mt-1 text-sm text-gray-100">
            <span className={shown ? "text-white" : "text-red-300 line-through"}>{text}</span>
            <span className={`ml-2 text-[11px] ${shown ? "text-emerald-300" : "text-red-300"}`}>
              {shown ? "Visible" : "Oculto"}
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => decide(!shown)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${
            shown
              ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
        >
          {loading ? "..." : shown ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {shown
          ? "Se ve en la ficha, las historias y el carrusel."
          : "No se muestra en público hasta que lo des por válido."}
      </p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
