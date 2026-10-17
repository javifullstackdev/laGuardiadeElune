"use client";

import { useState } from "react";

type ScoredRun = {
  dungeon: string;
  level: number;
  timed: boolean;
  guild_characters: string[];
  guild_count: number;
  party_size: number;
  scored: boolean;
  reason: string;
};

type Report = {
  season: string | null;
  characters: number;
  runs_seen: number;
  runs_new: number;
  runs_scored: number;
  transactions: number;
  errors: string[];
  runs?: ScoredRun[];
};

function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg);
    }
  }
  return fallback;
}

const STATS: { key: keyof Report; label: string }[] = [
  { key: "characters", label: "Personajes verificados" },
  { key: "runs_seen", label: "Partidas vistas" },
  { key: "runs_new", label: "Partidas nuevas" },
  { key: "runs_scored", label: "Que puntúan (≥3 hermandad)" },
  { key: "transactions", label: "Puntos otorgados" },
];

export default function SyncMythicButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function sync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/points/sync-mythic-plus", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReport(null);
        setError(apiDetail(data, "No se pudo revisar las míticas"));
        return;
      }
      setReport(data as Report);
    } catch {
      setReport(null);
      setError("No se pudo contactar con la API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={sync}
        disabled={loading}
        className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? "Revisando Raider.io…" : "Revisar míticas ahora"}
      </button>
      {loading && (
        <p className="text-sm text-gray-400">
          Puede tardar un minuto: consulta el roster, los personajes verificados y las keys nuevas.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {report && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <p className="text-sm text-gray-300">
            Temporada:{" "}
            <span className="text-yellow-400 font-medium">{report.season ?? "ninguna"}</span>
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STATS.map((stat) => (
              <div key={stat.key} className="rounded-lg bg-gray-800/70 border border-gray-700 px-3 py-2">
                <dt className="text-xs text-gray-400">{stat.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{report[stat.key]}</dd>
              </div>
            ))}
          </dl>
          {report.runs_new === 0 && (report.runs?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400">
              No hay partidas nuevas desde el inicio de puntos. Raider.io suele tardar horas en
              publicar las keys, y solo se miran personajes Retail verificados.
            </p>
          )}
          {(report.runs?.length ?? 0) > 0 && (
            <ul className="space-y-2">
              {report.runs!.map((run) => (
                <li
                  key={`${run.dungeon}-${run.level}-${run.reason}`}
                  className="rounded-lg bg-gray-800/70 border border-gray-700 px-3 py-2 text-sm"
                >
                  <p className="text-gray-200">
                    {run.dungeon} +{run.level} {run.timed ? "a tiempo" : "fuera de tiempo"}
                    {run.scored ? "" : " · no puntúa"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {run.guild_characters.length > 0
                      ? run.guild_characters.join(", ")
                      : "Nadie del roster"}{" "}
                    ({run.guild_count}/{run.party_size} de la hermandad)
                  </p>
                </li>
              ))}
            </ul>
          )}
          {report.errors.length > 0 && (
            <div>
              <p className="text-sm text-amber-400 mb-2">Avisos ({report.errors.length})</p>
              <ul className="text-xs text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                {report.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
