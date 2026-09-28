"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { WikiCharacter } from "@/lib/wiki";
import WikiCharacterView from "@/app/personajes/WikiCharacterView";

export default function FichaPreview({
  char,
  onClose,
}: {
  char: WikiCharacter;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-[#030712] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa de la ficha pública"
    >
      <div className="sticky top-0 z-50 flex h-12 items-center justify-between gap-3 px-4 sm:px-6 border-b border-white/10 bg-[#0b0b0b]">
        <p className="min-w-0 truncate font-quest text-[11px] sm:text-xs tracking-[0.14em] uppercase text-[#e4ddd0]">
          Vista previa · ficha pública
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-3 py-1.5 rounded-md border border-white/15 bg-white/5 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          Cerrar
        </button>
      </div>
      <WikiCharacterView char={char} preview loggedIn onDismiss={onClose} />
    </div>,
    document.body,
  );
}
