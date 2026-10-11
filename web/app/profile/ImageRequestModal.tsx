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

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-300">
        {label}
        {required ? <span className="text-amber-400"> *</span> : null}
      </span>
      {hint ? <span className="block text-[11px] text-gray-500 leading-snug">{hint}</span> : null}
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-gray-500";

export default function ImageRequestModal({ open, kind, char, onClose, onSubmitted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [posture, setPosture] = useState("");
  const [expression, setExpression] = useState("");
  const [emphasis, setEmphasis] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setError(null);
      setOk(false);
      setFile(null);
      setPreview(null);
      setPosture("");
      setExpression("");
      setEmphasis("");
      setExtraNotes("");
    }
    if (!open && el.open) el.close();
  }, [open, char]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Adjunta una captura del juego.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const answers = {
      posture,
      expression,
      emphasis,
      extra_notes: extraNotes,
    };
    const fd = new FormData();
    fd.append("name", char.name);
    fd.append("realm", char.realm);
    fd.append("kind", kind);
    fd.append("answers_json", JSON.stringify(answers));
    fd.append("file", file);

    const res = await fetch("/api/image-requests", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(
        typeof data.detail === "string"
          ? data.detail
          : data.error ?? "No se pudo enviar la solicitud"
      );
      return;
    }
    setOk(true);
    onSubmitted?.();
  }

  const title = kind === "face" ? "Solicitar foto de cara" : "Solicitar imagen completa";

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
              {char.name} · Adjunta una captura clara del personaje. La imagen define apariencia
              y equipo; abajo solo indícenos ajustes opcionales.
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
            <p className="text-green-400 font-medium">Solicitud enviada</p>
            <p className="text-sm text-gray-400">
              Generaremos el arte con la captura y la línea estética de la hermandad.
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
                  Captura del juego <span className="text-amber-400">*</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Dressing Room, transmog o similar. JPEG, PNG o WebP · máx. 8 MB.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 text-gray-200"
                  >
                    {file ? "Cambiar captura" : "Adjuntar captura"}
                  </button>
                  {file && <span className="text-xs text-gray-500 truncate">{file.name}</span>}
                </div>
                {preview && (
                  <img
                    src={preview}
                    alt=""
                    className="mt-2 max-h-48 rounded-lg border border-white/10 object-contain bg-black/40"
                  />
                )}
              </div>

              <p className="text-[11px] text-gray-500 border-t border-white/5 pt-3">
                Opcional — solo si quieres cambiar algo respecto a la captura:
              </p>

              <Field
                label="Postura o acción"
                hint="Ej.: mirando a cámara, con el bastón alzado, caminando..."
              >
                <input
                  className={inputCls}
                  value={posture}
                  onChange={(e) => setPosture(e.target.value)}
                  placeholder="Dejar vacío para usar la de la captura"
                />
              </Field>

              <Field
                label="Expresión"
                hint="Ej.: serena, desafiante, sonrisa leve..."
              >
                <input
                  className={inputCls}
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                />
              </Field>

              <Field
                label="Énfasis en algún detalle"
                hint="Ej.: las gemas de las hombreras, el brillo del arma, el peinado..."
              >
                <textarea
                  className={`${inputCls} min-h-[3.5rem] resize-y`}
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value)}
                />
              </Field>

              <Field label="Notas adicionales">
                <textarea
                  className={`${inputCls} min-h-[3rem] resize-y`}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Cualquier otro ajuste..."
                />
              </Field>

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
                {submitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </footer>
          </>
        )}
      </form>
    </dialog>
  );
}
