"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PATHS = [
  {
    value: "COMPETITIVE",
    icon: "⚔️",
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
    icon: "📖",
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
    icon: "🌀",
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

export default function PathPicker({ currentPath }: { currentPath: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // currentPath viene como "competitive" / "campaign" / "hybrid" (lowercase)
  const [selected, setSelected] = useState(currentPath.toUpperCase());

  function handleSelect(value: string) {
    if (value === selected || isPending) return;
    setSelected(value);

    startTransition(async () => {
      await fetch("/api/users/set-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: value }),
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      {PATHS.map((p) => {
        const isSelected = selected === p.value;
        return (
          <button
            key={p.value}
            onClick={() => handleSelect(p.value)}
            disabled={isPending}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-4 ${
              isSelected
                ? `${p.activeBorder} ${p.glow}`
                : `${p.border} hover:border-gray-500 bg-gray-900/40`
            }`}
          >
            {/* Icono */}
            <span className="text-2xl">{p.icon}</span>

            {/* Texto */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm ${isSelected ? p.textColor : "text-gray-200"}`}>
                  {p.name}
                </p>
                {p.recommended && (
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
                  ? `${p.activeBorder} ${p.glow.replace("bg-", "bg-").replace("/10", "/60")}`
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

      {isPending && (
        <p className="text-xs text-gray-500 text-center">Guardando...</p>
      )}
    </div>
  );
}
