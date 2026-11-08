"use client";

import { FormEvent, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-yellow-500/60";

export default function RecruitForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reason, setReason] = useState("");
  const [company, setCompany] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          reason,
          company,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "No se ha podido enviar. Inténtalo de nuevo.");
        return;
      }
      setSent(true);
      setFirstName("");
      setLastName("");
      setReason("");
    } catch {
      setError("No se ha podido enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-sm text-yellow-100">
        Solicitud enviada. La hermandad la leerá.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Empresa
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-gray-300">
          Nombre
          <input
            required
            maxLength={60}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={inputClass}
            autoComplete="given-name"
          />
        </label>
        <label className="block text-sm text-gray-300">
          Apellido
          <input
            required
            maxLength={60}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className={inputClass}
            autoComplete="family-name"
          />
        </label>
      </div>
      <label className="block text-sm text-gray-300">
        Razón
        <textarea
          required
          minLength={8}
          maxLength={2000}
          rows={6}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Por qué te gustaría entrar en la Guardia"
          className={`${inputClass} resize-y`}
        />
      </label>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
