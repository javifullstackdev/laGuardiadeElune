import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/components/Breadcrumb";
import PostTile from "../components/PostTile";
import { CATEGORIES, getCategoryStyle, type Post } from "@/lib/posts";
import { boardToPost, type CraftBoardCard } from "@/lib/craft-board";

import { apiUrl } from "@/lib/api";

export const metadata: Metadata = {
  title: "Tablón",
  description:
    "Novedades, guías y crónicas de la hermandad La Guardia de Elune.",
};

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [res, boardRes] = await Promise.all([
    fetch(apiUrl("/posts/"), { cache: "no-store" }),
    fetch(apiUrl("/craft-orders/board"), { cache: "no-store" }),
  ]);
  const posts: Post[] = res.ok ? await res.json() : [];
  const board: CraftBoardCard[] = boardRes.ok ? await boardRes.json() : [];
  const orders = category && category !== "pedidos" ? [] : Array.isArray(board) ? board : [];
  const filtered = category === "pedidos"
    ? []
    : category
      ? posts.filter((p) => p.category?.toLowerCase() === category.toLowerCase())
      : posts;
  const cards = [
    ...orders.map((card) => ({ post: boardToPost(card), href: "/pedidos" as const })),
    ...filtered.map((post) => ({ post, href: undefined })),
  ];
  const active = category ? getCategoryStyle(category) : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { label: active ? active.label : "Tablón" },
          ]}
        />
        <h1 className="text-3xl font-quest-display font-bold">
          {active ? active.label : "Tablón"}
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          {active
            ? `Publicaciones de ${active.label.toLowerCase()}.`
            : "Todas las novedades, guías y crónicas de la hermandad."}
        </p>

        <div className="flex flex-wrap gap-2 mt-6 mb-8">
          <Link
            href="/posts"
            className={`text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-sm ${
              !category ? "bg-white text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
            }`}
          >
            Todo
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/posts?category=${c.value}`}
              className={`text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-sm ${
                category === c.value ? "bg-white text-black" : "bg-[#1a1a1a] text-gray-400 hover:text-white"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        {cards.length === 0 ? (
          <p className="text-gray-500 py-16 text-center">
            Aún no hay publicaciones en esta sección.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => (
              <li key={card.post.id}>
                <PostTile post={card.post} href={card.href} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
