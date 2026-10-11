import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import LikesPanel from "./LikesPanel";

import { apiUrl } from "@/lib/api";

export default async function AdminLikesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, ranking] = await Promise.all([
    fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(apiUrl("/likes/admin/ranking?limit=50"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
  ]);

  if (!me || (me.role !== "admin" && me.role !== "officer")) redirect("/admin");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Likes</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8 max-w-3xl">
          Control de likes en posts, historias y fichas para premios y anti-trampas. Cada jugador
          con Discord solo puede dar un like por contenido (o quitarlo).
        </p>
        <LikesPanel initial={ranking} />
      </div>
    </main>
  );
}
