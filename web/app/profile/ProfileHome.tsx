"use client";

import { useState } from "react";
import Link from "next/link";

import PathPicker from "../onboarding/PathPicker";
import type { Mission } from "@/lib/missions";
import { formatMoney } from "@/lib/gold";
import { PATH_LABEL } from "@/lib/points";

function missionKey(mission: Mission) {
  const character = mission.character;
  return character
    ? `${mission.key}-${character.game}-${character.realm}-${character.name}`
    : mission.key;
}

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

export type ProfileSection =
  | "bio"
  | "details"
  | "points"
  | "achievements"
  | "titles"
  | "stories"
  | "relations"
  | "professions";

export const PROFILE_SECTIONS: { key: ProfileSection; label: string }[] = [
  { key: "bio", label: "Ficha" },
  { key: "details", label: "Datos" },
  { key: "points", label: "Puntos" },
  { key: "achievements", label: "Logros" },
  { key: "titles", label: "Títulos" },
  { key: "stories", label: "Historias" },
  { key: "relations", label: "Relaciones" },
  { key: "professions", label: "Profesiones" },
];

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
  character = null,
  hasCharacter,
  onOpenMission,
}: {
  user: HomeUser;
  missions: Mission[];
  character?: { name: string; realm: string; game: string } | null;
  hasCharacter: boolean;
  onOpenMission: (mission: Mission) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const pending = missions.filter((mission) => {
    if (mission.status === "done") return false;
    if (!character || !mission.character) return true;
    return (
      mission.character.name === character.name &&
      mission.character.realm === character.realm &&
      mission.character.game === character.game
    );
  });

  return (
    <div className="space-y-4">
        <section className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-4">
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

        <section className="rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-4">
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
          {pending.length === 0 ? (
            <p className="text-sm text-gray-500">No hay misiones pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((mission) => {
                const key = missionKey(mission);
                const open = openKey === key;
                const actionClass =
                  "inline-flex w-full items-center justify-center gap-2 bg-yellow-500/90 px-3 py-2.5 text-sm font-medium text-black hover:bg-yellow-400 sm:w-auto sm:rounded-lg";
                return (
                  <li key={key} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/80">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      <img src="/missions/quest.png" alt="" className="h-8 w-auto shrink-0" />
                      <h3 className="min-w-0 flex-1 font-quest font-semibold leading-none tracking-wide text-gray-100">
                        {mission.title}
                      </h3>
                      <span className="shrink-0 text-base font-bold text-yellow-500">+{mission.points}</span>
                    </button>
                    {open && (
                      <div>
                        <div className="px-4">
                          {mission.subject && (
                            <p className="text-sm font-medium text-gray-100">{mission.subject}</p>
                          )}
                          <p className={`text-sm text-gray-400 ${mission.subject ? "mt-2" : ""}`}>{mission.description}</p>
                          {mission.goal != null && mission.goal > 0 && (
                            <div className="mt-3">
                              <div className="mb-2 flex justify-between text-xs text-gray-400">
                                <span>{formatMoney(mission.progress ?? 0)}</span>
                                <span>{formatMoney(mission.goal)}</span>
                              </div>
                              <div className="h-5 overflow-hidden rounded-full bg-gray-800">
                                <div
                                  className="h-full bg-yellow-400"
                                  style={{
                                    width: `${Math.min(100, Math.round(((mission.progress ?? 0) / mission.goal) * 100))}%`,
                                  }}
                                />
                              </div>
                              {mission.contributions && mission.contributions.length > 0 ? (
                                <ul className="mt-3 space-y-1">
                                  {mission.contributions.map((row) => (
                                    <li key={`${row.realm}-${row.name}`} className="text-sm text-gray-300">
                                      {row.name}: {formatMoney(row.copper)}
                                    </li>
                                  ))}
                                </ul>
                              ) : mission.key === "forever_gold_10" ? (
                                <p className="mt-3 text-sm text-gray-500">Todavía no hay oro confirmado.</p>
                              ) : null}
                            </div>
                          )}
                          {mission.status === "review" && (
                            <p className="mt-3 text-sm text-amber-300/90">{MISSION_COPY[mission.key]?.review}</p>
                          )}
                        </div>
                        <div className="mt-4 sm:flex sm:justify-end sm:px-4 sm:pb-4">
                          {mission.status === "review" ? (
                            (mission.character || hasCharacter) && (
                              <button type="button" onClick={() => onOpenMission(mission)} className={actionClass}>
                                {MISSION_COPY[mission.key]?.see}
                              </button>
                            )
                          ) : mission.key === "forever_gold_10" ? (
                            <Link href="/banco?tab=gold" className={actionClass}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              Enviar oro
                            </Link>
                          ) : mission.character || hasCharacter ? (
                            <button type="button" onClick={() => onOpenMission(mission)} className={actionClass}>
                              {MISSION_COPY[mission.key]?.open}
                            </button>
                          ) : (
                            <Link href="/characters" className={actionClass}>
                              Añadir un personaje
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
    </div>
  );
}
