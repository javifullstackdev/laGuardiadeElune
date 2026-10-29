import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { apiUrl } from "@/lib/api";
import type { BankItem, BankRequest } from "@/lib/bank";
import BankAdmin from "./BankAdmin";

export default async function AdminBancoPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };

  const me = await fetch(apiUrl("/users/me"), { headers, cache: "no-store" }).then((r) =>
    r.ok ? r.json() : null,
  );
  if (!me || me.role !== "admin") redirect("/admin");

  const [queue, catalog] = await Promise.all([
    fetch(apiUrl("/bank/admin/queue"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<BankRequest[]>,
    fetch(apiUrl("/bank/admin/items"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<BankItem[]>,
  ]);

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Banco</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8 max-w-2xl">
          Publica los materiales que la hermandad necesita, los puntos de cada uno y, si quieres, un
          cupo. Al aceptar un ingreso, esa cantidad se resta del cupo y se otorgan los puntos de la
          tarifa publicada.
        </p>
        <BankAdmin
          queue={Array.isArray(queue) ? queue : []}
          catalog={Array.isArray(catalog) ? catalog : []}
        />
      </div>
    </main>
  );
}
