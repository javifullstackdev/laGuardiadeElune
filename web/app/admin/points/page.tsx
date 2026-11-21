import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { apiUrl } from "@/lib/api";
import PointsAdmin from "./PointsAdmin";
import type { HistoryTx } from "./PointsHistory";

type Season = {
  name: string;
  points_start_at: string | null;
};

export default async function AdminPointsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}` };
  const [me, season, history] = await Promise.all([
    fetch(apiUrl("/users/me"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    ),
    fetch(apiUrl("/seasons/current"), { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    ) as Promise<Season | null>,
    fetch(apiUrl("/points/admin/history?limit=150"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<HistoryTx[]>,
  ]);

  if (!me || me.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Puntos</h1>
        </div>
        <PointsAdmin season={season} initialHistory={history} />
      </div>
    </main>
  );
}
