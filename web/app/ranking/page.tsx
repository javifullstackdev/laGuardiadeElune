const CLASS_COLOR: Record<string, string> = {
  WARRIOR:      "#C79C6E", PALADIN:      "#F58CBA", HUNTER:       "#ABD473",
  ROGUE:        "#FFF569", PRIEST:       "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN:       "#0070DE", MAGE:         "#69CCF0", WARLOCK:      "#9482C9",
  MONK:         "#00FF96", DRUID:        "#FF7D0A", DEMONHUNTER:  "#A330C9",
  EVOKER:       "#33937F",
};

const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador",
  ROGUE: "Pícaro", PRIEST: "Sacerdote", DEATH_KNIGHT: "Caballero de la Muerte",
  SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo",
  MONK: "Monje", DRUID: "Druida", DEMONHUNTER: "Cazador de Demonios",
  EVOKER: "Evocador",
};

const PODIUM_STYLE = [
  { border: "border-yellow-400", glow: "#FFD70033", label: "1", size: "text-2xl font-bold text-yellow-400" },
  { border: "border-gray-400",   glow: "#C0C0C033", label: "2", size: "text-2xl font-bold text-gray-400"   },
  { border: "border-amber-600",  glow: "#CD7F3233", label: "3", size: "text-2xl font-bold text-amber-600"  },
];

type RankEntry = {
  position: number;
  username: string;
  discord_id: string;
  total_points: number;
  avatar_url: string | null;
  guild_title: string;
  character: {
    name: string;
    realm: string;
    wow_class: string | null;
    role_function: string | null;
    is_verified: boolean;
  } | null;
};

export default async function RankingPage() {
  const res = await fetch("http://localhost:8000/users/ranking?limit=20", { cache: "no-store" });
  const ranking: RankEntry[] = res.ok ? await res.json() : [];
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="text-center py-12 px-4">
        <h1 className="text-4xl font-bold mb-2">Ranking</h1>
        <p className="text-gray-400">La Guardia de Elune — Clasificación por puntos</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* Podio top 3 */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-4 mb-12">
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry) => {
              const style = PODIUM_STYLE[entry.position - 1];
              const charClass = entry.character?.wow_class ?? null;
              const color = CLASS_COLOR[charClass ?? ""] ?? "#888";
              const className = CLASS_NAME_ES[charClass ?? ""] ?? null;

              return (
                <div
                  key={entry.discord_id}
                  className={`flex flex-col items-center rounded-xl border-2 ${style.border} p-4 transition-transform hover:scale-105`}
                  style={{
                    background: `radial-gradient(ellipse at top, ${style.glow}, transparent)`,
                    minWidth: entry.position === 1 ? "180px" : "160px",
                  }}
                >
                  <span className={style.size}>{style.label}</span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt={entry.username} className="w-14 h-14 rounded-full border-2 border-gray-600 my-2" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 my-2" />
                  )}
                  <p className="font-bold text-center text-sm">{entry.username}</p>
                  {entry.character && (
                    <p className="text-xs text-center mt-1" style={{ color }}>
                      {entry.character.name}
                      {entry.character.is_verified && (
                        <span className="ml-1 text-gray-400 text-xs">· verificado</span>
                      )}
                    </p>
                  )}
                  {className && (
                    <p className="text-xs text-gray-500 mt-0.5">{className}</p>
                  )}
                  <p className="text-yellow-400 font-bold mt-2">
                    {entry.total_points.toLocaleString()} pts
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Resto del ranking */}
        {rest.length > 0 && (
          <ul className="space-y-2">
            {rest.map((entry) => {
              const charClass = entry.character?.wow_class ?? null;
              const color = CLASS_COLOR[charClass ?? ""] ?? "#888";
              const className = CLASS_NAME_ES[charClass ?? ""] ?? null;

              return (
                <li key={entry.discord_id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors">
                  <span className="text-gray-500 font-mono w-6 text-right text-sm">
                    {entry.position}
                  </span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt={entry.username} className="w-9 h-9 rounded-full border border-gray-700" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.username}</p>
                    {entry.character ? (
                      <p className="text-xs truncate" style={{ color }}>
                        {entry.character.name}-{entry.character.realm}
                        {className && ` · ${className}`}
                        {entry.character.is_verified && (
                          <span className="ml-1 text-gray-500">· verificado</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">sin personaje registrado</p>
                    )}
                  </div>
                  <span className="text-yellow-400 font-bold text-sm shrink-0">
                    {entry.total_points.toLocaleString()} pts
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {ranking.length === 0 && (
          <p className="text-center text-gray-500 mt-12">No hay miembros en el ranking todavía.</p>
        )}
      </div>
    </main>
  );
}
