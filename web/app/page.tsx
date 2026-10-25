import Link from "next/link";
import HomeHero from "./components/HomeHero";
import HomeReveal from "./components/HomeReveal";
import FadeUp from "./components/FadeUp";
import { HERO_SLIDES, type HeroSlide } from "@/lib/hero";
import { getCategoryStyle, postSubtitle, formatDate, postHref} from "@/lib/posts";
import { boardToPost, type CraftBoardCard } from "@/lib/craft-board";
import { mythicHref, mythicToPost, type MythicRun } from "@/lib/mythic-board";
import StoryTile from "./components/StoryTile";
import WikiTile from "./components/WikiTile";
import type { StoryPublic } from "@/lib/stories";
import type { WikiListItem } from "@/lib/wiki";

import { apiUrl } from "@/lib/api";
type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
  subtitle: string | null;
  cover_url: string | null;
};

export default async function Home() {
  const [postsRes, storiesRes, wikiRes, heroRes, boardRes, mythicRes] = await Promise.all([
    fetch(apiUrl("/posts/"), { cache: "no-store" }),
    fetch(apiUrl("/stories/"), { cache: "no-store" }),
    fetch(apiUrl("/wiki/"), { cache: "no-store" }),
    fetch(apiUrl("/hero/"), { cache: "no-store" }),
    fetch(apiUrl("/craft-orders/board"), { cache: "no-store" }),
    fetch(apiUrl("/points/mythic-plus?limit=1"), { cache: "no-store" }),
  ]);
  const posts: Post[] = postsRes.ok ? await postsRes.json() : [];
  const board: CraftBoardCard[] = boardRes.ok ? await boardRes.json() : [];
  const mythics: MythicRun[] = mythicRes.ok ? await mythicRes.json() : [];
  const tablon = homeTablon(posts, Array.isArray(board) ? board : [], Array.isArray(mythics) ? mythics : []);
  const stories: StoryPublic[] = storiesRes.ok ? await storiesRes.json() : [];
  const wiki: WikiListItem[] = wikiRes.ok ? await wikiRes.json() : [];
  const heroSlides: HeroSlide[] = heroRes.ok ? await heroRes.json() : [];
  const storyGrid = stories.slice(0, 4);
  const wikiGrid = wiki.slice(0, 4);

  const wikiListClass =
    wikiGrid.length > 1
      ? "flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:overscroll-auto"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3";
  const wikiItemClass =
    wikiGrid.length > 1 ? "w-[80%] shrink-0 snap-start sm:w-full h-full" : "h-full";

  return (
    <main className="relative min-h-screen">
      <HomeReveal>
        <div className="flex flex-col sm:min-h-[calc(100svh-3rem)]">
          <HomeHero slides={heroSlides.length > 0 ? heroSlides : HERO_SLIDES} />

          {tablon.length > 0 && (
            <section id="tablon" className="shrink-0 px-4 pt-3 pb-5 sm:pt-4 sm:pb-6">
              <div className="flex items-end justify-between mb-4 sm:mb-5">
                <h2 className="text-xl sm:text-2xl font-quest font-bold">Tablón</h2>
                <Link href="/posts" className="text-xs sm:text-sm text-gray-500 hover:text-gray-300">
                  Ver todos
                </Link>
              </div>
              <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain md:grid md:grid-cols-4 md:overflow-visible md:overscroll-auto">
                {tablon.map((tile) => (
                  <li
                    key={tile.post.id}
                    className={
                      tablon.length > 1
                        ? "w-[80%] shrink-0 snap-start md:w-auto md:min-w-0"
                        : "w-full md:w-auto md:min-w-0"
                    }
                  >
                    <PostTile post={tile.post} href={tile.href} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {wikiGrid.length > 0 && (
          <section className="px-4 pb-10 sm:pb-14">
            <FadeUp>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-quest font-bold">Personajes</h2>
                <Link href="/personajes" className="text-xs sm:text-sm text-gray-500 hover:text-gray-300">
                  Ver todos ({wiki.length})
                </Link>
              </div>
            </FadeUp>
            <FadeUp delayMs={60}>
              <ul className={wikiListClass}>
                {wikiGrid.map((item) => (
                  <li key={`${item.name}-${item.realm}`} className={wikiItemClass}>
                    <WikiTile item={item} />
                  </li>
                ))}
              </ul>
            </FadeUp>
          </section>
        )}

        {storyGrid.length > 0 && (
          <section className="px-4 pb-10 sm:pb-14">
            <FadeUp>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-quest font-bold">Historias</h2>
                <Link href="/lore" className="text-xs sm:text-sm text-gray-500 hover:text-gray-300">
                  Ver todas
                </Link>
              </div>
            </FadeUp>
            <ul
              className={
                storyGrid.length > 1
                  ? "flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain md:grid md:grid-cols-4 md:overflow-visible md:overscroll-auto"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              }
            >
              {storyGrid.map((story, i) => (
                <li
                  key={story.id}
                  className={
                    storyGrid.length > 1
                      ? "w-[80%] shrink-0 snap-start md:w-auto md:min-w-0"
                      : undefined
                  }
                >
                  <FadeUp className="h-full" delayMs={80 + i * 70}>
                    <StoryTile story={story} />
                  </FadeUp>
                </li>
              ))}
            </ul>
          </section>
        )}
      </HomeReveal>
    </main>
  );
}

function byNewest(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
  );
}

function latestOf(posts: Post[], category: string): Post | null {
  return byNewest(posts.filter((post) => (post.category ?? "").toLowerCase() === category))[0] ?? null;
}

function homeTablon(posts: Post[], orders: CraftBoardCard[], runs: MythicRun[]) {
  const row: { post: Post; href?: string }[] = [];
  const used = new Set<string>();
  const noticia = latestOf(posts, "noticias");
  const guia = latestOf(posts, "guias");
  if (noticia) {
    row.push({ post: noticia });
    used.add(noticia.id);
  }
  if (guia) {
    row.push({ post: guia });
    used.add(guia.id);
  }
  if (runs[0]) row.push({ post: mythicToPost(runs[0]), href: mythicHref(runs[0].id) });
  if (orders[0]) {
    row.push({ post: boardToPost(orders[0]), href: "/pedidos" });
    return row;
  }
  const spare = byNewest(posts.filter((post) => !used.has(post.id)));
  for (const post of spare) {
    if (row.length >= 4) break;
    row.push({ post });
  }
  return row;
}

function PostTile({ post, href }: { post: Post; href?: string }) {
  const cat = getCategoryStyle(post.category);
  const subtitle = postSubtitle(post);

  return (
    <Link
      href={href ?? postHref(post)}
      draggable={false}
      className="group flex flex-col h-full rounded-lg overflow-hidden bg-[#151515] hover:bg-[#1c1c1c] transition-colors select-none [-webkit-touch-callout:none] [-webkit-user-drag:none]"
    >
        <div className="relative aspect-[16/11] overflow-hidden bg-[#111]">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt={`Portada: ${post.title}`}
              draggable={false}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 select-none pointer-events-none [-webkit-user-drag:none]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          {post.category && (
            <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${cat.flag}`}>
              {cat.label}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
          <h3 className="font-quest font-bold text-[15px] leading-snug text-white line-clamp-2">
            {post.title}
          </h3>
          <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2 min-h-[2.75em]">
            {subtitle || "\u00A0"}
          </p>
          <p className="mt-auto pt-4 text-xs font-semibold text-white text-right">
            {formatDate(post.published_at)}
          </p>
        </div>
      </Link>
  );
}
