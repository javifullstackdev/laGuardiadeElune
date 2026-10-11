"use client";

import EluneWordmark from "./EluneWordmark";
import { useLogoChrome } from "./logo-chrome";

/** Wordmark en la barra cuando el logo de fondo está oculto. */
export default function NavbarBrand() {
  const { watermarkHidden } = useLogoChrome();

  return (
    <div
      className={`mr-auto flex items-center min-w-0 transition-all duration-500 ease-out ${
        watermarkHidden
          ? "opacity-100 translate-x-0"
          : "opacity-0 -translate-x-2 pointer-events-none"
      }`}
    >
      <EluneWordmark compact />
    </div>
  );
}
