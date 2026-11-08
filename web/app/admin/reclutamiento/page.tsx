import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiUrl } from "@/lib/api";
import RecruitAdmin, { type Application } from "./RecruitAdmin";

export default async function AdminReclutamientoPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");

  const me = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!me.ok) redirect("/");
  const user = await me.json();
  if (user.role !== "admin") redirect("/");

  const res = await fetch(apiUrl("/recruitment/admin"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const applications: Application[] = res.ok ? await res.json() : [];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Reclutamiento</h1>
        <p className="mt-2 text-sm text-gray-400">
          Solicitudes de quien quiere entrar en la hermandad.
        </p>
        <RecruitAdmin initial={applications} />
      </div>
    </main>
  );
}
