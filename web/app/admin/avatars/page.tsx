import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AvatarReviewPanel from "./AvatarReviewPanel";

type PendingAvatar = {
  name: string;
  realm: string;
  game: string;
  owner_username: string;
  pending_avatar_url: string;
};

export default async function AdminAvatarsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending] = await Promise.all([
    fetch("http://localhost:8000/users/me", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch("http://localhost:8000/characters/pending-avatars", {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
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
          <h1 className="text-2xl font-bold">Imágenes pendientes</h1>
        </div>

        {pending.length === 0 ? (
          <p className="text-gray-500">No hay imágenes pendientes de revisión.</p>
        ) : (
          <AvatarReviewPanel pending={pending as PendingAvatar[]} />
        )}
      </div>
    </main>
  );
}
