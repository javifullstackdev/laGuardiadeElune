import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StoryReviewPanel from "./StoryReviewPanel";
import StoryCoverButton from "./StoryCoverButton";
import StoryHeadingField from "./StoryHeadingField";
import StoryDeleteButton from "./StoryDeleteButton";
import type { StoryPending, StoryPublic } from "@/lib/stories";
import { storyHref } from "@/lib/stories";
import { formatDate } from "@/lib/posts";

import { apiUrl } from "@/lib/api";
export default async function AdminStoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending, published] = await Promise.all([
    fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(apiUrl("/stories/pending"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(apiUrl("/stories/"), { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : [],
    ),
  ]);

  if (!me || me.role !== "admin") redirect("/");

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
            Puedes cambiar el título, el subtítulo y la imagen de una historia ya publicada. El enlace se queda igual. Solo el Eremita o un administrador puede eliminarla.
          </p>
          {publishedStories.length === 0 ? (
            <p className="text-gray-500">No hay historias publicadas.</p>
          ) : (
            <ul className="space-y-3">
              {publishedStories.map((story) => (
                <li
                  key={story.id}
                  className="flex items-start justify-between gap-4 bg-gray-900 rounded-xl border border-gray-800 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <StoryHeadingField
                      storyId={story.id}
                      title={story.title}
                      subtitle={story.subtitle ?? null}
                      href={storyHref(story)}
                    />
                    <p className="text-sm text-gray-500 truncate">
                      {story.character_name}
                      {story.character_realm ? ` · ${story.character_realm}` : ""}
                      {" · "}
                      {story.author_username}
                      {story.published_at ? ` · ${formatDate(story.published_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <StoryCoverButton storyId={story.id} coverUrl={story.cover_url} />
                    <StoryDeleteButton storyId={story.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
