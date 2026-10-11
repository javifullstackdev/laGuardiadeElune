"use client";

import Link from "next/link";

/**
 * Solo las letras del logo (assets de EluneLogoReveal).
 * Misma anchura en ambas líneas: "LA GUARDIA DE" se escala al ancho de ELUNE.
 */
export default function EluneWordmark({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex flex-col items-center justify-center leading-none ${
        compact ? "w-[5.5rem]" : "w-40"
      } ${className}`}
      aria-label="La Guardia de Elune — Inicio"
    >
      <img
        src="/elune/la-guardia-de.png"
        alt=""
        draggable={false}
        className="w-[88%] h-auto select-none"
      />
      <img
        src="/elune/elune.png"
        alt=""
        draggable={false}
        className="w-full h-auto select-none mt-0.5"
      />
    </Link>
  );
}
