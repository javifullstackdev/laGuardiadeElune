import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl } from "@/lib/api";
import SorteosClient, { type GuildDraw } from "./SorteosClient";

export const metadata: Metadata = {
  title: "Sorteos",
  robots: { index: false, follow: false },
};

export default async function SorteosPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };

  const [drawsRes, meRes] = await Promise.all([
    fetch(apiUrl("/draws"), { headers, cache: "no-store" }),
    fetch(apiUrl("/users/me"), { headers, cache: "no-store" }),
  ]);
  if (meRes.status === 401 || drawsRes.status === 401) redirect("/");
  const me = meRes.ok
    ? ((await meRes.json()) as { id: string; role: string })
    : null;
  const draws = drawsRes.ok ? ((await drawsRes.json()) as GuildDraw[]) : [];

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Breadcrumb items={[{ href: "/", label: "Inicio" }, { label: "Sorteos" }]} />
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-quest-display font-bold">Sorteos</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl">
            Sorteos de la hermandad
          </p>
        </header>
        <SorteosClient
          initialDraws={Array.isArray(draws) ? draws : []}
          loadError={
            drawsRes.ok
              ? ""
              : "No se han podido cargar los sorteos. Si acabas de actualizar el proyecto, aplica las migraciones."
          }
          userId={me?.id ?? ""}
          isAdmin={me?.role === "admin"}
        />
      </div>
    </main>
  );
}
