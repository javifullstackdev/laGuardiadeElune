import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { apiUrl } from "@/lib/api";
import CraftPointsAdmin, { type CraftScoreRow } from "./CraftPointsAdmin";

type Queue = { points_per_order: number; orders: CraftScoreRow[] };

export default async function AdminPedidosPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };

  const me = await fetch(apiUrl("/users/me"), { headers, cache: "no-store" }).then((r) =>
    r.ok ? r.json() : null,
  );
  if (!me || me.role !== "admin") redirect("/admin");

  const queue = (await fetch(apiUrl("/craft-orders/admin"), { headers, cache: "no-store" }).then((r) =>
    r.ok ? r.json() : null,
  )) as Queue | null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Pedidos</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8 max-w-2xl">
          Cada pedido recogido da estos puntos al artesano. El valor por defecto es 50. Quien va por
          competitivo, o no tiene itinerario de artesanía y farmeo, queda a cero.
        </p>
        <CraftPointsAdmin
          pointsPerOrder={queue?.points_per_order ?? 50}
          initial={Array.isArray(queue?.orders) ? queue.orders : []}
        />
      </div>
    </main>
  );
}
