import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BioReviewPanel from "./BioReviewPanel";
import type { BioPending } from "@/lib/bio";

export default async function AdminBiosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending] = await Promise.all([
    fetch("http://localhost:8000/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch("http://localhost:8000/bios/pending", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
  ]);

  if (!me || (me.role !== "admin" && me.role !== "officer")) redirect("/admin");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </a>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Fichas</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          El jugador responde un cuestionario. Tú escribes la biografía que sale en Personajes.
        </p>
        <BioReviewPanel pending={pending as BioPending[]} />
      </div>
    </main>
  );
}
