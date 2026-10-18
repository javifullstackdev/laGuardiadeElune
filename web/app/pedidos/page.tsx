import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl } from "@/lib/api";
import PedidosClient, { type Crafter, type CraftOrder, type MyCharacter } from "./PedidosClient";

export const metadata: Metadata = {
  title: "Pedidos",
  robots: { index: false, follow: false },
};

const PROFESSIONS = [
  { id: 164, name: "Herrería" },
  { id: 165, name: "Peletería" },
  { id: 197, name: "Sastrería" },
  { id: 202, name: "Ingeniería" },
  { id: 773, name: "Inscripción" },
  { id: 171, name: "Alquimia" },
  { id: 755, name: "Joyería" },
  { id: 333, name: "Encantamiento" },
  { id: 185, name: "Cocina" },
];

export default async function PedidosPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };

  const [orders, crafters, characters, me] = await Promise.all([
    fetch(apiUrl("/craft-orders"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<CraftOrder[]>,
    fetch(apiUrl("/craft-orders/crafters"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<Crafter[]>,
    fetch(apiUrl("/bank/characters"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ) as Promise<MyCharacter[]>,
    fetch(apiUrl("/users/me"), { headers, cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null,
    ) as Promise<{ id: string; role: string } | null>,
  ]);

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Breadcrumb items={[{ href: "/", label: "Inicio" }, { label: "Pedidos" }]} />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-quest-display font-bold">Pedidos</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl">
            Pide armas, armaduras y objetos que solo salen de una profesión. Al elegirla ves quién
            de la hermandad la tiene más alta. Los puntos de la fabricación van al artesano de
            Campaña o Híbrido; Competitivo no suma.
          </p>
        </header>
        <PedidosClient
          professions={PROFESSIONS}
          initialOrders={Array.isArray(orders) ? orders : []}
          crafters={Array.isArray(crafters) ? crafters : []}
          characters={Array.isArray(characters) ? characters : []}
          userId={me?.id ?? ""}
          isStaff={me?.role === "admin" || me?.role === "officer"}
        />
      </div>
    </main>
  );
}
