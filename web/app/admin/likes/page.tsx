import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

  if (!me || me.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold">Likes</h1>
        <p className="text-sm text-gray-400 mb-8 max-w-3xl">
          Control de likes en posts, historias y fichas para premios y anti-trampas. Cada jugador
          con Discord solo puede dar un like por contenido (o quitarlo).
        </p>
        <LikesPanel initial={ranking} />
      </div>
    </main>
  );
}
