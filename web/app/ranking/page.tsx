import { apiUrl } from "@/lib/api";

type RankCharacter = {
  name: string;
  realm: string;
  wow_class: string | null;
  is_main: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  level: number | null;
};

type RankEntry = {
  position: number;
  username: string;
  discord_id: string;
  total_points: number;
  avatar_url: string | null;
  guild_title: string;
  characters: RankCharacter[];
  character: {
    name: string;
    realm: string;
    wow_class: string | null;
    role_function: string | null;
    is_verified: boolean;
  } | null;
};

type RankGroup = {
  position: number;
  total_points: number;
  entries: RankEntry[];
};

function groupByRank(ranking: RankEntry[]): RankGroup[] {
  const groups: RankGroup[] = [];
  for (const entry of ranking) {
    const last = groups[groups.length - 1];
    if (last && last.total_points === entry.total_points) {
      last.entries.push(entry);
    } else {
      groups.push({
        position: entry.position,
        total_points: entry.total_points,
        entries: [entry],
      });
    }
  }
  return groups;
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default async function RankingPage() {
  const res = await fetch(apiUrl("/users/ranking?limit=50"), { cache: "no-store" });
  const ranking: RankEntry[] = res.ok ? await res.json() : [];
  const groups = groupByRank(
    ranking.map((e) => ({
      ...e,
      characters: e.characters ?? (e.character
        ? [{
            name: e.character.name,
            realm: e.character.realm,
            wow_class: e.character.wow_class,
            is_main: true,
            is_verified: e.character.is_verified,
            avatar_url: null,
            level: null,
          }]
        : []),
    })),
  );

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-quest-display font-bold">Ranking</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            La Guardia de Elune — clasificación por puntos. Misma puntuación, misma posición.
          </p>
        </header>

        {groups.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No hay miembros en el ranking todavía.</p>
        ) : (
          <ol className="space-y-3 sm:space-y-4">
            {groups.map((group) => (
              <li
                key={`${group.position}-${group.total_points}`}
                className="flex items-center gap-2.5 sm:gap-4"
              >
                <span className="shrink-0 w-10 sm:w-14 text-right font-quest-display font-bold text-yellow-400/90 leading-none text-2xl sm:text-3xl tabular-nums">
                  {group.position}º
                </span>

                <ul className="flex-1 min-w-0 flex gap-2 sm:gap-3">
                  {group.entries.map((entry) => (
                    <li key={entry.discord_id} className="flex-1 min-w-0">
                      <RankCard entry={entry} />
                    </li>
                  ))}
                </ul>

                <p className="shrink-0 text-yellow-400 font-bold text-sm sm:text-lg tabular-nums w-12 sm:w-16 text-right">
                  {group.total_points.toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

function RankCard({ entry }: { entry: RankEntry }) {
  const main = entry.characters.find((c) => c.is_main) ?? entry.characters[0] ?? null;
  const mainAvatar = main?.avatar_url ?? null;

  return (
    <article className="h-full rounded-xl border border-white/10 bg-[#0c1220] hover:border-white/20 transition-colors overflow-hidden">
      <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 min-w-0">
        {mainAvatar ? (
          <img
            src={mainAvatar}
            alt=""
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-white/15 shrink-0 object-cover"
          />
        ) : (
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gray-800 border border-white/10 shrink-0 flex items-center justify-center text-xs font-bold text-gray-400">
            {initials(entry.username)}
          </div>
        )}

        <p className="min-w-0 flex-1 font-semibold text-white truncate text-sm sm:text-base">
          {entry.username}
        </p>
      </div>
    </article>
  );
}
