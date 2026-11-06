"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveCharacterButton({
  name,
  realm,
  game,
}: {
  name: string;
  realm: string;
  game: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const ok = window.confirm(
      `¿Quitar a ${name} de tu lista? Si tenía ficha pública, deja de verse en Personajes. Puedes volver a añadirlo desde Battle.net.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ name, realm, game });
    const res = await fetch(`/api/characters/remove?${params}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.detail === "string" ? data.detail : "No se pudo quitar el personaje.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="ml-auto inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="text-xs text-gray-500 hover:text-red-500 disabled:opacity-50"
      >
        {busy ? "..." : "Quitar"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
