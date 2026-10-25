import Link from "next/link";
import type { MythicPlayer, MythicRole, MythicRun } from "@/lib/mythic-board";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABEL: Record<MythicRole, string> = {
  tank: "Tanque",
  healer: "Sanador",
  dps: "Daño",
};

function RoleMark({ role, spec }: { role?: MythicRole | null; spec?: string | null }) {
  const balance = spec === "balance";
  if (!balance && role !== "tank" && role !== "healer" && role !== "dps") return null;
  const label = balance ? "Equilibrio" : ROLE_LABEL[role as MythicRole];
  return (
    <span title={label} aria-label={label} className="inline-flex shrink-0 text-white">
      {balance ? <MoonIcon /> : role === "tank" ? <ShieldIcon /> : role === "healer" ? <SparklesIcon /> : <SwordIcon />}
    </span>
  );
}

function OutlineIcon({ d }: { d: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <OutlineIcon d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  );
}

function MoonIcon() {
  return (
    <OutlineIcon d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
  );
}

function SparklesIcon() {
  return (
    <OutlineIcon d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  );
}

function SwordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-5 h-5" aria-hidden>
      <path d="M216,32H152a8,8,0,0,0-6.34,3.12l-64,83.21L72,108.69a16,16,0,0,0-22.64,0l-12.69,12.7a16,16,0,0,0,0,22.63l20,20-28,28a16,16,0,0,0,0,22.63l12.69,12.68a16,16,0,0,0,22.62,0l28-28,20,20a16,16,0,0,0,22.64,0l12.69-12.7a16,16,0,0,0,0-22.63l-9.64-9.64,83.21-64A8,8,0,0,0,224,104V40A8,8,0,0,0,216,32ZM52.69,216,40,203.32l28-28L80.68,188Zm70.61-8L48,132.71,60.7,120,136,195.31ZM208,100.06l-81.74,62.88L115.32,152l50.34-50.34a8,8,0,0,0-11.32-11.31L104,140.68,93.07,129.74,155.94,48H208Z" />
    </svg>
  );
}

function CharacterName({ player }: { player: MythicPlayer }) {
  const name = player.character_name ?? "—";
  if (!player.profile_path || !player.character_name) {
    return <p className="font-medium text-gray-100 truncate">{name}</p>;
  }
  return (
    <Link
      href={player.profile_path}
      className="font-medium text-yellow-100 truncate underline decoration-yellow-100/40 underline-offset-2 hover:text-yellow-300"
    >
      {name}
    </Link>
  );
}

export default function MythicRunCard({ run }: { run: MythicRun }) {
  const pace = run.timed === true ? "A tiempo" : run.timed === false ? "Fuera de tiempo" : "Mítica+";
  const names =
    run.guild_characters.length > 0
      ? run.guild_characters
      : run.players.map((player) => player.character_name || player.username).filter(Boolean);

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <header className="relative min-h-[13rem] isolate">
        {run.dungeon_image_url ? (
          <img
            src={run.dungeon_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/75 to-black/25" />
        <div className="relative z-10 flex flex-col justify-end min-h-[13rem] p-5">
          <p className="text-xs uppercase tracking-wider text-yellow-400/90">{pace}</p>
          <h1 className="text-2xl font-quest-display font-bold text-white mt-1 leading-tight">
            {run.dungeon}
            {run.mythic_level != null && <span className="text-yellow-400"> +{run.mythic_level}</span>}
          </h1>
          <p className="text-sm text-gray-200 mt-2">
            {fmtDate(run.completed_at)}
            <span className="text-gray-500"> · </span>
            {fmtTime(run.completed_at)}
          </p>
          {names.length > 0 && (
            <p className="text-sm text-gray-200 mt-3">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-0.5">
                Participantes
              </span>
              {names.join(", ")}
            </p>
          )}
        </div>
      </header>
      {run.players.length > 0 && (
        <>
          <div className="hidden sm:grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem] gap-3 px-5 py-2 text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-800">
            <span>Personaje</span>
            <span>Jugador</span>
            <span className="text-right">Puntos</span>
          </div>
          <ul className="divide-y divide-gray-800">
            {run.players.map((player) => {
              const partial = player.weekly_capped && player.points !== player.amount;
              return (
                <li
                  key={`${player.username}-${player.character_name ?? ""}`}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem] gap-1 sm:gap-3 sm:items-center px-5 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RoleMark role={player.role} spec={player.spec} />
                    <CharacterName player={player} />
                  </div>
                  <p className="text-sm text-gray-300 truncate">{player.username}</p>
                  <p className={`font-bold tabular-nums sm:text-right ${player.points > 0 ? "text-green-400" : "text-gray-400"}`}>
                    {player.points > 0 ? "+" : ""}
                    {player.points}
                    {partial ? (
                      <span className="block text-[11px] font-normal text-gray-500">de {player.amount}</span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </article>
  );
}
