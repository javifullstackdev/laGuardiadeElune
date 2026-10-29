"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PATHS = [
  {
    value: "COMPETITIVE",
    name: "Competitivo",
    description: "Participa en míticas+ y raid con miembros de la Guardia y ayudáos unos a otros a avanzar.",
    detail: "Hasta 500 puntos por semana entre míticas+, raid y JcJ.",
    border: "border-red-500/40",
    activeBorder: "border-red-500",
    glow: "bg-red-500/10",
    textColor: "text-red-400",
  },
  {
    value: "CAMPAIGN",
    name: "Artesanía y farmeo de materiales",
    description: "Farmea materiales y craftea ítems con tus profesiones.",
    detail: "Hasta 500 puntos por semana. Cuentan el banco y la artesanía.",
    border: "border-purple-500/40",
    activeBorder: "border-purple-500",
    glow: "bg-purple-500/10",
    textColor: "text-purple-400",
  },
];

export default function PathPicker({
  currentPath,
  seasonName,
  resplitPending = false,
}: {
  currentPath: string | null;
  seasonName: string;
  resplitPending?: boolean;
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
              <p className={`font-semibold text-sm ${isSelected ? p.textColor : "text-gray-200"}`}>
                {p.name}
              </p>
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

      {!locked && resplitPending && (
        <p className="text-xs text-gray-400">
          Tenías híbrido. Si eliges Competitivo, de esta temporada se quedan los puntos de míticas+.
          Si eliges Artesanía y farmeo de materiales, solo los del banco. Lo demás deja de contar.
        </p>
      )}

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
