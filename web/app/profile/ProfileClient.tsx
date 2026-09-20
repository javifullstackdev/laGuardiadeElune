"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Tipos ──────────────────────────────────────────────────────────────────

type User = {
  username: string;
  guild_title: string;
  total_points: number;
  avatar_url: string | null;
  role: string;
  path: string;
  blizzard_battletag: string | null;
  has_blizzard: boolean;
};

type Character = {
  name: string;
  realm: string;
  wow_class: string | null;
  role_function: string | null;
  is_main: boolean;
  is_alt: boolean;
  is_verified: boolean;
};

type Transaction = {
  amount: number;
  reason: string;
  event_category: string | null;
  created_at: string;
};

// ── Datos de clases WoW ───────────────────────────────────────────────────
// Colores y emojis oficiales de cada clase

const CLASS_COLOR: Record<string, string> = {
  WARRIOR:     "#C79C6E",
  PALADIN:     "#F58CBA",
  HUNTER:      "#ABD473",
  ROGUE:       "#FFF569",
  PRIEST:      "#FFFFFF",
  DEATH_KNIGHT:"#C41F3B",
  SHAMAN:      "#0070DE",
  MAGE:        "#69CCF0",
  WARLOCK:     "#9482C9",
  MONK:        "#00FF96",
  DRUID:       "#FF7D0A",
  DEMONHUNTER: "#A330C9",
  EVOKER:      "#33937F",
};

const CLASS_ICON: Record<string, string> = {
  WARRIOR:     "⚔️",
  PALADIN:     "🛡️",
  HUNTER:      "🏹",
  ROGUE:       "🗡️",
  PRIEST:      "✨",
  DEATH_KNIGHT:"💀",
  SHAMAN:      "⚡",
  MAGE:        "🔮",
  WARLOCK:     "🔥",
  MONK:        "🥋",
  DRUID:       "🌿",
  DEMONHUNTER: "👁️",
  EVOKER:      "🐉",
};

const ROLE_LABEL: Record<string, string> = {
  TANK:       "🛡️ Tank",
  HEALER:     "💚 Healer",
  DPS_MELEE:  "⚔️ DPS Melé",
  DPS_RANGED: "🏹 DPS a distancia",
};

const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR:     "Guerrero",
  PALADIN:     "Paladín",
  HUNTER:      "Cazador",
  ROGUE:       "Pícaro",
  PRIEST:      "Sacerdote",
  DEATH_KNIGHT:"Caballero de la Muerte",
  SHAMAN:      "Chamán",
  MAGE:        "Mago",
  WARLOCK:     "Brujo",
  MONK:        "Monje",
  DRUID:       "Druida",
  DEMONHUNTER: "Cazador de Demonios",
  EVOKER:      "Evocador",
};

// ── Componente principal ───────────────────────────────────────────────────

export default function ProfileClient({
  user,
  characters: initialChars,
  transactions,
}: {
  user: User;
  characters: Character[];
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // El primer personaje siempre es el main (ordenado en el servidor)
  const [characters, setCharacters] = useState<Character[]>(initialChars);
  const [selected, setSelected] = useState<Character | null>(
    initialChars[0] ?? null
  );

  // ── Establecer main ────────────────────────────────────────────────────

  async function handleSetMain(char: Character) {
    if (char.is_main) return;

    // Actualización optimista — la UI cambia inmediatamente
    const updated = characters.map((c) => ({
      ...c,
      is_main: c.name === char.name && c.realm === char.realm,
      is_alt:  !(c.name === char.name && c.realm === char.realm),
    }));
    // Reordenar: main primero
    updated.sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));

    setCharacters(updated);
    setSelected({ ...char, is_main: true });

    // Llamar a la API en segundo plano
    startTransition(async () => {
      const res = await fetch("/api/characters/set-main", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: char.name, realm: char.realm }),
      });
      if (!res.ok) {
        // Revertir si falla
        setCharacters(initialChars);
        setSelected(char);
      } else {
        // Refrescar datos del servidor para que el Server Component se actualice
        router.refresh();
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-950 text-white">

      {/* ── Sidebar izquierdo ─────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

        {/* Datos del jugador */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-14 h-14 rounded-full border-2 border-gray-600"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
                🧙
              </div>
            )}
            <div>
              <p className="font-bold text-lg leading-tight">{user.username}</p>
              <p className="text-gray-400 text-sm">{user.guild_title}</p>
            </div>
          </div>

          {/* BattleTag */}
          {user.blizzard_battletag ? (
            <div className="flex items-center gap-2">
              <p className="text-sm text-blue-400">
                ⚔️ {user.blizzard_battletag}
              </p>
              <form method="POST" action="/api/auth/blizzard/unlink">
                <button
                  type="submit"
                  title="Desconectar Battle.net"
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="http://localhost:8000/auth/blizzard/login"
              className="text-xs text-gray-500 hover:text-blue-400 underline mb-2 block"
            >
              🔗 Conectar Battle.net
            </Link>
          )}

          {/* Puntos */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-400 text-xl">★</span>
            <span className="text-yellow-300 font-bold text-lg">
              {user.total_points.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">puntos</span>
          </div>
        </div>

        {/* Lista de personajes */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">
            Personajes
          </p>

          {characters.length === 0 ? (
            <p className="text-gray-500 text-sm px-2">Sin personajes</p>
          ) : (
            <ul className="space-y-1">
              {characters.map((char) => {
                const color = CLASS_COLOR[char.wow_class ?? ""] ?? "#888";
                const icon  = CLASS_ICON[char.wow_class ?? ""] ?? "❓";
                const isSelected =
                  selected?.name === char.name && selected?.realm === char.realm;

                return (
                  <li key={`${char.name}-${char.realm}`}>
                    <button
                      onClick={() => setSelected(char)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        isSelected
                          ? "bg-gray-700 ring-1 ring-gray-500"
                          : "hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold truncate text-sm"
                          style={{ color }}
                        >
                          {char.name}
                          {char.is_main && (
                            <span className="ml-1 text-yellow-400">⭐</span>
                          )}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {char.realm}
                        </p>
                      </div>
                      {char.is_verified && (
                        <span title="Verificado por Blizzard" className="text-blue-400 text-xs">
                          🛡️
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Botón añadir */}
        <div className="p-3 border-t border-gray-800">
          <Link
            href="/personajes"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
          >
            <span>+</span> Añadir desde Battle.net
          </Link>
        </div>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {selected ? (
          <CharacterDetail
            char={selected}
            transactions={transactions}
            onSetMain={() => handleSetMain(selected)}
            isPending={isPending}
          />
        ) : (
          <EmptyState hasBnet={user.has_blizzard} />
        )}
      </main>

    </div>
  );
}

// ── Detalle del personaje ──────────────────────────────────────────────────

function CharacterDetail({
  char,
  transactions,
  onSetMain,
  isPending,
}: {
  char: Character;
  transactions: Transaction[];
  onSetMain: () => void;
  isPending: boolean;
}) {
  const color    = CLASS_COLOR[char.wow_class ?? ""] ?? "#888888";
  const icon     = CLASS_ICON[char.wow_class ?? ""]  ?? "❓";
  const className = CLASS_NAME_ES[char.wow_class ?? ""] ?? char.wow_class ?? "Desconocida";
  const roleLabel = ROLE_LABEL[char.role_function ?? ""] ?? char.role_function ?? null;

  return (
    <div className="max-w-2xl">

      {/* Cabecera del personaje */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{icon}</span>
          <div>
            <h1
              className="text-4xl font-bold"
              style={{ color, textShadow: `0 0 20px ${color}40` }}
            >
              {char.name}
            </h1>
            <p className="text-gray-400 text-lg mt-1">
              {char.realm} — {className}
            </p>

            {/* Badges */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {char.is_main && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium border border-yellow-500/30">
                  ⭐ Personaje principal
                </span>
              )}
              {char.is_verified && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                  🛡️ Verificado por Blizzard
                </span>
              )}
              {roleLabel && (
                <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botón establecer como main */}
        {!char.is_main && (
          <button
            onClick={onSetMain}
            disabled={isPending}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? "Actualizando..." : "⭐ Establecer como personaje principal"}
          </button>
        )}
      </div>

      {/* Separador */}
      <div
        className="h-px mb-8 opacity-30"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
      />

      {/* Info del personaje */}
      <section className="mb-8">
        <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
          Información
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoCard label="Clase" value={className} />
          <InfoCard label="Realm" value={char.realm} />
          {roleLabel && <InfoCard label="Función" value={roleLabel} />}
          <InfoCard label="Estado" value={char.is_verified ? "Verificado ✓" : "Sin verificar"} />
        </div>
      </section>

      {/* Historial de puntos */}
      <section>
        <h2 className="text-sm text-gray-500 uppercase tracking-wider mb-4">
          Actividad reciente
        </h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">Sin actividad registrada aún.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900"
              >
                <span
                  className={`text-lg font-bold w-16 text-right ${
                    t.amount > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{t.reason}</p>
                  {t.event_category && (
                    <p className="text-xs text-gray-500">{t.event_category}</p>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {new Date(t.created_at).toLocaleDateString("es-ES")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-gray-900">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-200">{value}</p>
    </div>
  );
}

function EmptyState({ hasBnet }: { hasBnet: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <span className="text-5xl mb-4">⚔️</span>
      <p className="text-gray-400 mb-4">
        {hasBnet
          ? "Selecciona un personaje del menú izquierdo"
          : "Conecta tu cuenta de Battle.net para ver tus personajes"}
      </p>
      {!hasBnet && (
        <Link
          href="http://localhost:8000/auth/blizzard/login"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium"
        >
          🔗 Conectar Battle.net
        </Link>
      )}
    </div>
  );
}
