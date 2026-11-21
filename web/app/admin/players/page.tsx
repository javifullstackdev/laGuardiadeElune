import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PlayersTable from "./PlayersTable";

import { apiUrl } from "@/lib/api";
export default async function AdminPlayersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };

  const [userRes, playersRes] = await Promise.all([
    fetch(apiUrl("/users/me"),             { headers, cache: "no-store" }),
    fetch(apiUrl("/users/admin/players"),  { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");
  const user = await userRes.json();
  if (user.role !== "admin") redirect("/");

  const players = playersRes.ok ? await playersRes.json() : [];

  return (
    <main className="min-h-screen">
      <div className="w-full max-w-6xl px-4 py-10 lg:px-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Jugadores</h1>
          <p className="text-gray-400 text-sm mt-1">
            {players.length} miembro{players.length !== 1 ? "s" : ""} · apodo = nombre en el ranking
          </p>
        </div>

        <PlayersTable players={players} />

      </div>
    </main>
  );
}
