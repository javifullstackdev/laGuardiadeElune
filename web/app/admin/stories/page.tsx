import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StoryReviewPanel from "./StoryReviewPanel";
import StoryBodyField from "./StoryBodyField";
import StoryCoverButton from "./StoryCoverButton";
import StoryCarouselButton from "./StoryCarouselButton";
import StoryOgButton from "./StoryOgButton";
import StoryHeadingField from "./StoryHeadingField";
import StoryDeleteButton from "./StoryDeleteButton";
import StoryCastField from "./StoryCastField";
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
      <div className="w-full max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold">Historias</h1>

        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-1">Pendientes de revisión</h2>
          <p className="text-sm text-gray-500 mb-5">
            Relatos escritos por los jugadores. Publica, pide cambios o rechaza.
            En los dos últimos casos el jugador lo ve en el buzón, corrige el texto y lo envía otra vez.
            La ficha de personaje se escribe en Fichas.
          </p>
          <StoryReviewPanel pending={pending as StoryPending[]} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-1">Publicadas</h2>
          <p className="text-sm text-gray-500 mb-5">
            Puedes cambiar el título, el subtítulo, el enlace, el texto y quién aparece. La tarjeta admite foto o GIF. El carrusel y la imagen de WhatsApp y X son fotos fijas, y no sustituyen a la tarjeta. Si cambias el enlace, el anterior sigue abriendo la historia. Solo el Eremita o un administrador puede eliminarla.
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
                      slug={story.slug ?? null}
                      cardLines={story.card_lines ?? []}
                      href={storyHref(story)}
                    />
                    <p className="text-sm text-gray-500 truncate">
                      {story.character_name}
                      {story.character_realm ? ` · ${story.character_realm}` : ""}
                      {" · "}
                      {story.author_username}
                      {story.published_at ? ` · ${formatDate(story.published_at)}` : ""}
                    </p>
                    <StoryBodyField
                      storyId={story.id}
                      biography={story.biography}
                      personality={story.personality}
                      appearance={story.appearance}
                    />
                    <StoryCastField storyId={story.id} relations={story.relations} />
                    <div className="grid gap-4 pt-1 lg:grid-cols-3">
                      <StoryCoverButton storyId={story.id} coverUrl={story.cover_url} />
                      <StoryCarouselButton
                        storyId={story.id}
                        carouselImageUrl={story.carousel_image_url ?? null}
                      />
                      <StoryOgButton storyId={story.id} ogImageUrl={story.og_image_url ?? null} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
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
