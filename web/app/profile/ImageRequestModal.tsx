"use client";

import { useEffect, useRef, useState } from "react";

type CharLite = {
  name: string;
  realm: string;
  race: string | null;
  gender: string | null;
  wow_class: string | null;
};

type Props = {
  open: boolean;
  kind: "face" | "full";
  char: CharLite;
  onClose: () => void;
  onSubmitted?: () => void;
};

const MAX_FILES = 6;

export default function ImageRequestModal({ open, kind, char, onClose, onSubmitted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setError(null);
      setOk(false);
      setFiles([]);
      setPreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
    }
    if (!open && el.open) el.close();
  }, [open, char]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function onFiles(list: File[]) {
    if (list.length > MAX_FILES) {
      setError(`Puedes adjuntar hasta ${MAX_FILES} capturas.`);
    } else {
      setError(null);
    }
    const next = list.slice(0, MAX_FILES);
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return next.map((file) => URL.createObjectURL(file));
    });
    setFiles(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Adjunta al menos una captura del juego.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.append("name", char.name);
    fd.append("realm", char.realm);
    fd.append("kind", kind);
    for (const file of files) fd.append("files", file);

    const res = await fetch("/api/image-requests", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "No se pudieron enviar las capturas"
      );
      return;
    }
    setOk(true);
    onSubmitted?.();
  }

  const title = kind === "face" ? "Capturas de la cara" : "Capturas del personaje";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[min(36rem,calc(100vw-1.5rem))] max-h-[min(90vh,44rem)] rounded-2xl border border-white/10 bg-[#0c1220] text-white p-0 shadow-2xl backdrop:bg-black/70"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[min(90vh,44rem)]">
        <header className="shrink-0 px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-gray-400 mt-1">
              {char.name} · Adjunta fotos in-game. El Eremita las descarga y, si publica tu ficha, crea el retrato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm"
          >
            Cerrar
          </button>
        </header>

        {ok ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-green-400 font-medium">Capturas enviadas</p>
            <p className="text-sm text-gray-400">
              Quedan en manos del Eremita. Si le convence la ficha, publicará la imagen él mismo.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-300">
                  Capturas del juego <span className="text-amber-400">*</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Dressing Room, primer plano o cuerpo entero. JPEG, PNG o WebP · hasta {MAX_FILES} archivos · 8 MB cada uno.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-gray-200"
                >
                  {files.length > 0 ? "Cambiar capturas" : "Adjuntar capturas"}
                </button>
                {files.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`} className="truncate">{file.name}</li>
                    ))}
                  </ul>
                )}
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previews.map((src) => (
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="h-28 w-full rounded-lg border border-white/10 object-contain bg-black/40"
                      />
                    ))}
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <footer className="shrink-0 px-5 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-yellow-600/90 hover:bg-yellow-500 text-black text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Enviar capturas"}
              </button>
            </footer>
          </>
        )}
      </form>
    </dialog>
  );
}
