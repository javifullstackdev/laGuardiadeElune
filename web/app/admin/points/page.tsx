import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { apiUrl } from "@/lib/api";
import SyncMythicButton from "./SyncMythicButton";

type Season = {
  name: string;
  points_start_at: string | null;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "aún no definido";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default async function AdminPointsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, season] = await Promise.all([
    fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(apiUrl("/seasons/current"), { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    ) as Promise<Season | null>,
  ]);

  if (!me || (me.role !== "admin" && me.role !== "officer")) redirect("/admin");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Puntos</h1>
        </div>

        <p className="text-sm text-gray-400 mb-6 max-w-2xl">
          El servidor revisa las míticas cada 6 horas. Este botón lanza una pasada ahora: roster de
          la hermandad, personajes Retail verificados y keys nuevas en Raider.io.
        </p>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-8 text-sm text-gray-300 space-y-1">
          <p>
            Temporada en curso:{" "}
            <span className="text-yellow-400 font-medium">{season?.name ?? "ninguna"}</span>
          </p>
          <p className="text-gray-400">
            Solo cuentan partidas posteriores a {formatWhen(season?.points_start_at ?? null)}.
          </p>
        </div>

        <SyncMythicButton />
      </div>
    </main>
  );
}
