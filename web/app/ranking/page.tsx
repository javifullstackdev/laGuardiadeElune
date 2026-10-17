import type { Metadata } from "next";
import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl } from "@/lib/api";
import type { Season } from "@/lib/points";
import RankingBoard, { type RankEntry, type RankGroup } from "./RankingBoard";

export const metadata: Metadata = {
  title: "Ranking",
  description:
    "Clasificación por puntos de temporada de los miembros de La Guardia de Elune.",
};

function groupByRank(ranking: RankEntry[]): RankGroup[] {
  const groups: RankGroup[] = [];
  for (const entry of ranking) {
    const last = groups[groups.length - 1];
    if (last && last.position === entry.position) {
      last.entries.push(entry);
    } else {
      groups.push({
        position: entry.position,
        points: entry.points,
        entries: [entry],
      });
    }
  }
  return groups;
}

type RankingApiRow = Omit<RankEntry, "points"> & {
  season_points: number;
  character?: {
    name: string;
    realm: string;
    wow_class: string | null;
    role_function: string | null;
    is_verified: boolean;
  } | null;
};

export default async function RankingPage() {
  const [res, seasonRes] = await Promise.all([
    fetch(apiUrl("/users/ranking?limit=50"), { cache: "no-store" }),
    fetch(apiUrl("/seasons/current"), { cache: "no-store" }),
  ]);
  const ranking: RankingApiRow[] = res.ok ? await res.json() : [];
  const season: Season | null = seasonRes.ok ? await seasonRes.json() : null;
  const groups = groupByRank(
    ranking.map((e) => ({
      position: e.position,
      username: e.username,
      discord_id: e.discord_id,
      points: season ? e.season_points : e.total_points,
      total_points: e.total_points,
      avatar_url: e.avatar_url,
      guild_title: e.guild_title,
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
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { label: "Ranking" },
          ]}
        />
        <header className="mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-quest-display font-bold">Ranking</h1>
          {season && (
            <p className="text-yellow-400/90 mt-2 text-sm sm:text-base font-semibold">{season.name}</p>
          )}
          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            La Guardia de Elune — clasificación por puntos de la temporada. Misma puntuación, mismo
            puesto (misma línea). En el móvil, toca una tarjeta para ver los puntos.
          </p>
        </header>

        {groups.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No hay miembros en el ranking todavía.</p>
        ) : (
          <RankingBoard groups={groups} />
        )}
      </div>
    </main>
  );
}
