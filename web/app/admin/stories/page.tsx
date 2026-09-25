import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import StoryReviewPanel from "./StoryReviewPanel";
import StoryDeleteButton from "./StoryDeleteButton";
import type { StoryPending, StoryPublic } from "@/lib/stories";
import { formatDate } from "@/lib/posts";

export default async function AdminStoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending, published] = await Promise.all([
    fetch("http://localhost:8000/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch("http://localhost:8000/stories/pending", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
    fetch("http://localhost:8000/stories/", { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ),
  ]);

  if (!me || (me.role !== "admin" && me.role !== "officer")) redirect("/admin");

  const publishedStories = published as StoryPublic[];

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </a>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Historias</h1>
        </div>

        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-1">Pendientes de revisión</h2>
          <p className="text-sm text-gray-500 mb-5">
            Relatos escritos por los jugadores. La ficha de personaje se escribe en Fichas.
          </p>
          <StoryReviewPanel pending={pending as StoryPending[]} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Publicadas</h2>
          <p className="text-sm text-gray-500 mb-5">
            Solo el Eremita o un administrador puede eliminar una historia publicada.
          </p>
          {publishedStories.length === 0 ? (
            <p className="text-gray-500">No hay historias publicadas.</p>
          ) : (
            <ul className="space-y-3">
              {publishedStories.map((story) => (
                <li
                  key={story.id}
                  className="flex items-center justify-between gap-4 bg-gray-900 rounded-xl border border-gray-800 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/lore/${story.id}`}
                      className="font-medium hover:text-yellow-400 transition-colors"
                    >
                      {story.title}
                    </Link>
                    <p className="text-sm text-gray-500 truncate">
                      {story.character_name}
                      {story.character_realm ? ` · ${story.character_realm}` : ""}
                      {" · "}
                      {story.author_username}
                      {story.published_at ? ` · ${formatDate(story.published_at)}` : ""}
                    </p>
                  </div>
                  <StoryDeleteButton storyId={story.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
