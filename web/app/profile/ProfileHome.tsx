"use client";

import Link from "next/link";

import PathPicker from "../onboarding/PathPicker";
import type { Mission } from "@/lib/missions";
import { PATH_LABEL } from "@/lib/points";

const MISSION_COPY: Record<string, { review: string; open: string; see: string }> = {
  publish_character_sheet: {
    review: "El Eremita está revisando tu ficha.",
    open: "Escribir la ficha",
    see: "Ver la ficha",
  },
  publish_first_story: {
    review: "El Eremita está revisando tu historia.",
    open: "Escribir la historia",
    see: "Ver la historia",
  },
};

type HomeUser = {
  username: string;
  avatar_url: string | null;
  total_points: number;
  season_points: number;
  path: string | null;
  season: { name: string } | null;
  hybrid_resplit_pending?: boolean;
};

export default function ProfileHome({
  user,
  missions,
  hasCharacter,
  onOpenMission,
  onOpenCharacters,
}: {
  user: HomeUser;
  missions: Mission[];
  hasCharacter: boolean;
  onOpenMission: (key: string) => void;
  onOpenCharacters: () => void;
}) {
  const pending = missions.filter((m) => m.status !== "done");
  const done = missions.filter((m) => m.status === "done");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full border border-gray-700 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 shrink-0 flex items-center justify-center text-sm font-bold text-gray-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">Perfil</p>
              <h1 className="text-2xl font-bold truncate">{user.username}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCharacters}
            className="md:hidden shrink-0 px-3 py-2 rounded-lg border border-gray-700 text-sm text-gray-300"
          >
            Personajes
          </button>
        </div>

        <section className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-gray-500">Puntos</h2>
          <p className="text-3xl font-bold text-yellow-400 mt-2">
            {user.total_points.toLocaleString("es-ES")}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {user.season
              ? `${user.season_points.toLocaleString("es-ES")} en ${user.season.name}`
              : "Sin temporada en curso"}
          </p>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-4 mb-10">
          <h2 className="text-xs uppercase tracking-wider text-gray-500">Itinerario</h2>
          {user.season ? (
            user.path ? (
              <div className="mt-2">
                <p className="text-lg font-semibold text-gray-100">
                  {PATH_LABEL[user.path] ?? user.path}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Fijado para {user.season.name}. Podrás elegir otro cuando empiece la siguiente temporada.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-300 mt-2">
                  ¿De qué forma vas a ayudar en la Guardia esta temporada?
                </p>
                <PathPicker
                  currentPath={null}
                  seasonName={user.season.name}
                  resplitPending={Boolean(user.hybrid_resplit_pending)}
                />
              </>
            )
          ) : (
            <p className="text-sm text-gray-400 mt-2">
              Todavía no hay una temporada en curso.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Misiones</h2>
          {pending.length === 0 && done.length === 0 ? (
            <p className="text-sm text-gray-500">No hay misiones ahora mismo.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((mission) => (
                <li key={mission.key} className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-gray-100">{mission.title}</h3>
                    <span className="text-sm font-bold text-yellow-400 shrink-0">+{mission.points}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{mission.description}</p>
                  {mission.status === "review" ? (
                    <div className="mt-3">
                      <p className="text-sm text-amber-300/90">{MISSION_COPY[mission.key]?.review}</p>
                      {hasCharacter && (
                        <button
                          type="button"
                          onClick={() => onOpenMission(mission.key)}
                          className="mt-2 text-sm text-gray-300 underline hover:text-white"
                        >
                          {MISSION_COPY[mission.key]?.see}
                        </button>
                      )}
                    </div>
                  ) : hasCharacter ? (
                    <button
                      type="button"
                      onClick={() => onOpenMission(mission.key)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium"
                    >
                      {MISSION_COPY[mission.key]?.open}
                    </button>
                  ) : (
                    <Link
                      href="/characters"
                      className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium"
                    >
                      Añadir un personaje
                    </Link>
                  )}
                </li>
              ))}
              {done.map((mission) => (
                <li key={mission.key} className="rounded-xl border border-gray-800/70 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-400">{mission.title}</h3>
                    <span className="text-xs text-gray-500 shrink-0">Cumplida · +{mission.points}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
