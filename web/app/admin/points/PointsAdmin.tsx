"use client";

import { useState } from "react";

import PointsHistory, { type HistoryTx } from "./PointsHistory";
import SyncMythicButton from "./SyncMythicButton";

type Season = {
  name: string;
  points_start_at: string | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "aún no definido";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default function PointsAdmin({
  season,
  initialHistory,
}: {
  season: Season | null;
  initialHistory: HistoryTx[];
}) {
  const [rows, setRows] = useState(initialHistory);
  const [query, setQuery] = useState("");

  async function load(nextQuery = query) {
    const qs = nextQuery.trim() ? `?q=${encodeURIComponent(nextQuery.trim())}` : "";
    const res = await fetch(`/api/admin/points/history${qs}`);
    const data = await res.json().catch(() => []);
    if (res.ok && Array.isArray(data)) setRows(data);
  }

  return (
    <>
      <p className="text-sm text-gray-400 mb-6 max-w-2xl">
        El servidor revisa las míticas cada 6 horas. Este botón lanza una pasada ahora: roster de
        la hermandad, personajes Retail verificados y keys nuevas en Raider.io.
      </p>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-8 text-sm text-gray-300 space-y-1">
        <p>
          Temporada en curso:{" "}
          <span className="text-yellow-400 font-medium">{season?.name ?? "ninguna"}</span>
        </p>
        <p className="text-gray-400">
          Solo cuentan partidas posteriores a {formatWhen(season?.points_start_at ?? null)}.
        </p>
      </div>

      <div className="mb-12">
        <SyncMythicButton
          onSynced={async () => {
            setQuery("");
            await load("");
          }}
        />
      </div>

      <PointsHistory
        rows={rows}
        onSearch={async (q) => {
          setQuery(q);
          await load(q);
        }}
        onReload={() => load(query)}
      />
    </>
  );
}
