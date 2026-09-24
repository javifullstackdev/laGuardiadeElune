import Link from "next/link";
import HomeHero from "./components/HomeHero";
import HomeReveal from "./components/HomeReveal";
import { HERO_SLIDES } from "@/lib/hero";
import { getCategoryStyle, postSubtitle, formatDate } from "@/lib/posts";

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
  const res = await fetch("http://localhost:8000/posts/", { cache: "no-store" });
  const posts: Post[] = res.ok ? await res.json() : [];
  const grid = posts.slice(0, 8);

  return (
    <main className="relative isolate min-h-screen bg-gray-950 text-white">
      <HomeReveal>
        <HomeHero slides={HERO_SLIDES} />

        <section id="tablon" className="px-4 py-10 sm:py-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Tablón</h2>
          <p className="text-xs sm:text-sm text-gray-500">Últimas publicaciones</p>
        </div>

        {grid.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>Aún no hay posts publicados.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {grid.map((post) => (
              <PostTile key={post.id} post={post} />
            ))}
          </ul>
        )}
        </section>
      </HomeReveal>
    </main>
  );
}

function PostTile({ post }: { post: Post }) {
  const cat = getCategoryStyle(post.category);
  const subtitle = postSubtitle(post);

  return (
    <li>
      <Link
        href={`/posts/${post.id}`}
        className="group flex flex-col h-full rounded-lg overflow-hidden bg-[#151515] hover:bg-[#1c1c1c] transition-colors"
      >
        <div className="relative aspect-[16/11] overflow-hidden bg-[#111]">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
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
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-gray-500">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-yellow-500/90 shrink-0" />
            <span className="truncate">La Guardia de Elune</span>
          </p>
          <h3 className="mt-1.5 font-bold text-[15px] leading-snug text-white line-clamp-2">
            {post.title}
          </h3>
          {subtitle && (
            <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2">
              {subtitle}
            </p>
          )}
          <p className="mt-auto pt-4 text-sm font-semibold text-white">
            {formatDate(post.published_at)}
          </p>
        </div>
      </Link>
    </li>
  );
}
