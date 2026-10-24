import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { permanentRedirect } from "next/navigation";
import type { StoryPublic } from "@/lib/stories";
import { loadWikiChar } from "@/lib/wiki";
import { isHorde } from "@/lib/wow";
import { parseStoryReadingMode, STORY_READING_COOKIE } from "@/lib/story-reading";
import StoryReader from "../StoryReader";

import { apiUrl } from "@/lib/api";
import { buildShareMetadata } from "@/lib/seo";

async function loadStory(
  ref: string,
  token?: string,
): Promise<StoryPublic | null> {
  const res = await fetch(apiUrl(`/stories/${encodeURIComponent(ref)}`), {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) return { title: "Historia no encontrada" };
  const description =
    (story.biography || story.personality || story.appearance || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 155) || `Historia de ${story.title} en La Guardia de Elune.`;
  return buildShareMetadata({
    title: story.title,
    description,
    path: `/lore/${story.slug ?? story.id}`,
    image: story.cover_url,
    type: "article",
    publishedTime: story.published_at,
  });
}

export default async function LoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const story = await loadStory(slug, token);

  if (story?.slug && story.slug !== slug) permanentRedirect(`/lore/${story.slug}`);

  if (!story) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Historia no encontrada.</p>
          <Link href="/lore" className="text-yellow-400 hover:underline">
            Volver a historias
          </Link>
        </div>
      </main>
    );
  }
  const wikiChar =
    story.character_realm && story.character_name
      ? await loadWikiChar(story.character_realm, story.character_name)
      : null;
  const isHordeStory = isHorde(
    story.character_faction ?? wikiChar?.faction,
    story.character_race ?? wikiChar?.race,
  );
  const initialMode = parseStoryReadingMode(cookieStore.get(STORY_READING_COOKIE)?.value);

  return (
    <StoryReader
      story={story}
      isHordeStory={isHordeStory}
      loggedIn={!!token}
      initialMode={initialMode}
    />
  );
}