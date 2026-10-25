import type { MythicRun } from "@/lib/mythic-board";

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
          <h2 className="text-2xl font-quest-display font-bold text-white mt-1 leading-tight">
            {run.dungeon}
            {run.mythic_level != null && <span className="text-yellow-400"> +{run.mythic_level}</span>}
          </h2>
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
                  key={`${player.username}-${player.character_name ?? ""}-${player.character_realm ?? ""}`}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_5.5rem] gap-1 sm:gap-3 sm:items-center px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-100 truncate">{player.character_name ?? "—"}</p>
                    {player.character_realm && (
                      <p className="text-xs text-gray-500 truncate">{player.character_realm}</p>
                    )}
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
