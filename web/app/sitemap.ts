import type { MetadataRoute } from "next";
import { apiUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

type WikiListItem = { name: string; realm: string };
type StoryListItem = { id: string; slug?: string | null };
type PostListItem = { id: string; slug?: string | null; published_at?: string };

async function safeJson<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(apiUrl(path), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/posts",
    "/personajes",
    "/lore",
    "/aviso-legal",
    "/privacidad",
    "/cookies",
    "/terminos",
  ].map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const [posts, wiki, stories] = await Promise.all([
    safeJson<PostListItem>("/posts/"),
    safeJson<WikiListItem>("/wiki/"),
    safeJson<StoryListItem>("/stories/"),
  ]);

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/posts/${encodeURIComponent(p.slug ?? p.id)}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const wikiEntries: MetadataRoute.Sitemap = wiki.map((item) => ({
    url: `${SITE_URL}/personajes/${encodeURIComponent(item.realm)}/${encodeURIComponent(item.name)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const storyEntries: MetadataRoute.Sitemap = stories.map((s) => ({
    url: `${SITE_URL}/lore/${encodeURIComponent(s.slug ?? s.id)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postEntries, ...wikiEntries, ...storyEntries];
}
