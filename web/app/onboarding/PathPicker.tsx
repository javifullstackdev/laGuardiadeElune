"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PATHS = [
  {
    value: "COMPETITIVE",
    name: "Competitivo",
    description: "M+ y Raids",
    detail: "Top 8 actividades competitivas por semana",
    border: "border-red-500/40",
    activeBorder: "border-red-500",
    glow: "bg-red-500/10",
    textColor: "text-red-400",
  },
  {
    value: "CAMPAIGN",
    name: "Campaña",
    description: "Rol, lore y logros",
    detail: "Top 8 actividades de campaña por semana",
    border: "border-purple-500/40",
    activeBorder: "border-purple-500",
    glow: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
  {
    value: "HYBRID",
    name: "Híbrido",
    description: "Todo en todas partes",
    detail: "4 mejores competitivos + 4 mejores campaña/semana",
    border: "border-blue-500/40",
    activeBorder: "border-blue-500",
    glow: "bg-blue-500/10",
    textColor: "text-blue-400",
    recommended: true,
  },
];

export default function PathPicker({
  currentPath,
  seasonName,
}: {
  currentPath: string | null;
  seasonName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const locked = currentPath !== null;
  const [selected, setSelected] = useState(currentPath?.toUpperCase() ?? null);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!selected || locked || isPending) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/users/set-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.detail ?? "No se pudo guardar el itinerario");
      }
      router.refresh();
    });
  }

  const visible = locked ? PATHS.filter((p) => p.value === selected) : PATHS;

  return (
    <div className="mt-3 space-y-2">
      {visible.map((p) => {
        const isSelected = selected === p.value;
        return (
          <button
            key={p.value}
            onClick={() => setSelected(p.value)}
            disabled={isPending || locked}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-4 ${
              isSelected
                ? `${p.activeBorder} ${p.glow}`
                : `${p.border} hover:border-gray-500 bg-gray-900/40`
            } ${locked ? "cursor-default" : ""}`}
          >
            {/* Texto */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${isSelected ? p.textColor : "text-gray-200"}`}>
                  {p.name}
                </p>
                {p.recommended && !locked && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Recomendado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
              <p className="text-xs text-gray-600 mt-0.5">{p.detail}</p>
            </div>

            {/* Indicador */}
            <div
              className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                isSelected
                  ? `${p.activeBorder} ${p.glow.replace("/10", "/60")}`
                  : "border-gray-600"
              }`}
            >
              {isSelected && (
                <div className={`w-full h-full rounded-full scale-50 ${p.glow.replace("/10", "")}`} />
              )}
            </div>
          </button>
        );
      })}

      {locked ? (
        <p className="text-xs text-gray-500">
          Itinerario fijado para {seasonName}. Podrás elegir otro cuando empiece la siguiente temporada.
        </p>
      ) : (
        <div className="pt-1 space-y-2">
          <p className="text-xs text-gray-500">
            Solo puedes elegir una vez por temporada: no se podrá cambiar hasta que termine {seasonName}.
          </p>
          <button
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className="w-full px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-800 disabled:text-gray-500 text-black text-sm font-bold transition-colors"
          >
            {isPending ? "Guardando..." : "Confirmar itinerario"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
