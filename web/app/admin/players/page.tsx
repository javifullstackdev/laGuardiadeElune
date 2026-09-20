import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlayersTable from "./PlayersTable";

export default async function AdminPlayersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };

  const [userRes, playersRes] = await Promise.all([
    fetch("http://localhost:8000/users/me",             { headers, cache: "no-store" }),
    fetch("http://localhost:8000/users/admin/players",  { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");
  const user = await userRes.json();
  if (user.role !== "admin" && user.role !== "officer") redirect("/");

  const players = playersRes.ok ? await playersRes.json() : [];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Jugadores</h1>
            <p className="text-gray-400 text-sm mt-1">
              {players.length} miembro{players.length !== 1 ? "s" : ""} registrado{players.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-300">
            &larr; Panel admin
          </Link>
        </div>

        <PlayersTable players={players} />

      </div>
    </main>
  );
}
