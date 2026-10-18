"use client";

import { useState, useTransition } from "react";

type Player = {
  id: string;
  username: string;
  display_name?: string | null;
  discord_username?: string;
  discord_id: string;
  guild_title: string;
  role: string;
  total_points: number;
  avatar_url: string | null;
  birthday: string | null;
  character_count: number;
  path: string | null;
};

const ROLE_BADGE: Record<string, string> = {
  admin:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  officer: "bg-blue-500/20   text-blue-300   border-blue-500/30",
  member:  "bg-gray-700/50   text-gray-400   border-gray-600/30",
};

const ROLE_LABEL: Record<string, string> = {
  admin:   "Líder",
  officer: "Oficial",
  member:  "Miembro",
};

function formatBirthday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function DisplayNameCell({ player }: { player: Player }) {
  const [editing, setEditing] = useState(false);
  const discordName = player.discord_username || player.username;
  const [value, setValue] = useState(player.display_name ?? "");
  const [current, setCurrent] = useState(player.display_name ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/players/${player.id}/display-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: value.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Error");
      } else {
        setCurrent(data.display_name ?? null);
        setValue(data.display_name ?? "");
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={discordName || "Apodo en ranking"}
          maxLength={255}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none min-w-[10rem]"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-2 py-1 rounded disabled:opacity-50"
        >
          {isPending ? "..." : "Guardar"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setValue(current ?? "");
            setError(null);
          }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancelar
        </button>
        {error && <span className="text-xs text-red-400">{String(error)}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300">
        {current || (
          <span className="text-gray-600">
            {discordName || "Sin apodo"} (Discord)
          </span>
        )}
      </span>
      <button
        onClick={() => {
          setValue(current ?? "");
          setEditing(true);
        }}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {current ? "Editar" : "Definir"}
      </button>
    </div>
  );
}

function BirthdayCell({ player }: { player: Player }) {
  const [editing, setEditing]   = useState(false);
  const [value, setValue]       = useState(player.birthday ?? "");
  const [current, setCurrent]   = useState(player.birthday);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSave() {
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/users/birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Error");
      } else {
        setCurrent(data.birthday);
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !value}
          className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-2 py-1 rounded disabled:opacity-50"
        >
          {isPending ? "..." : "Guardar"}
        </button>
        <button
          onClick={() => { setEditing(false); setError(null); }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancelar
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-300">
        {current ? formatBirthday(current) : <span className="text-gray-600">Sin fecha</span>}
      </span>
      <button
        onClick={() => { setValue(current ?? ""); setEditing(true); }}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {current ? "Editar" : "Añadir"}
      </button>
    </div>
  );
}

const PATH_OPTIONS = [
  { value: "competitive", label: "Competitivo" },
  { value: "campaign", label: "Campaña" },
  { value: "hybrid", label: "Híbrido" },
];

function PathCell({ player }: { player: Player }) {
  const [path, setPath] = useState(player.path);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    if (!next || next === path) return;
    const previous = path;
    setPath(next);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/players/${player.id}/path`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPath(previous);
        setError(data.detail ?? data.error ?? "No se pudo cambiar");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={path ?? ""}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none disabled:opacity-50"
      >
        <option value="" disabled>
          Sin elegir
        </option>
        {PATH_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{String(error)}</span>}
    </div>
  );
}

export default function PlayersTable({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.display_name ?? "").toLowerCase().includes(q) ||
      (p.discord_username ?? p.username).toLowerCase().includes(q) ||
      p.guild_title.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar jugador..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:border-gray-500"
      />

      <div className="space-y-2">
        {filtered.map((player) => {
          const label =
            player.display_name || player.discord_username || player.username;
          return (
            <div
              key={player.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={label}
                    className="w-9 h-9 rounded-full border border-gray-700 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {label.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{label}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full border ${ROLE_BADGE[player.role] ?? ROLE_BADGE.member}`}
                    >
                      {ROLE_LABEL[player.role] ?? player.role}
                    </span>
                  </div>
                  {player.display_name && player.discord_username && (
                    <p className="text-xs text-gray-600 truncate">
                      Discord: {player.discord_username}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-yellow-400 font-bold text-sm">
                    {player.total_points.toLocaleString()} pts
                  </p>
                  <p className="text-xs text-gray-600">
                    {player.character_count} personaje
                    {player.character_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3 grid grid-cols-1 gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Apodo ranking</span>
                  <DisplayNameCell player={player} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Itinerario</span>
                  <PathCell player={player} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Cumpleaños</span>
                  <BirthdayCell player={player} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0">Discord ID</span>
                  <span className="text-xs text-gray-600 font-mono">{player.discord_id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-12 text-sm">
          No se encontraron jugadores.
        </p>
      )}
    </div>
  );
}
