import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl } from "@/lib/api";
import type { BankItem, BankRequest } from "@/lib/bank";
import BancoClient from "./BancoClient";

export const metadata: Metadata = {
  title: "Banco",
  robots: { index: false, follow: false },
};

export default async function BancoPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };

  const [catalog, requests, characters, me] = await Promise.all([
    fetch(apiUrl("/bank/items"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<BankItem[]>,
    fetch(apiUrl("/bank/requests/mine"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<BankRequest[]>,
    fetch(apiUrl("/bank/characters"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<{ name: string; realm: string; is_main: boolean }[]>,
    fetch(apiUrl("/bank/me"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    ) as Promise<{ path: string | null; scores_points: boolean } | null>,
  ]);
  const scoresBankPoints = Boolean(me?.scores_points);

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Breadcrumb items={[{ href: "/", label: "Inicio" }, { label: "Banco" }]} />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-quest-display font-bold">Banco</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl">
            Registra lo que metes en el banco de hermandad o pide una retirada. Los ingresos los
            valida el administrador. Solo Campaña e Híbrido suman puntos; competitivo no.
          </p>
        </header>
        <BancoClient
          catalog={Array.isArray(catalog) ? catalog : []}
          initialRequests={Array.isArray(requests) ? requests : []}
          characters={Array.isArray(characters) ? characters : []}
          scoresBankPoints={scoresBankPoints}
        />
      </div>
    </main>
  );
}
