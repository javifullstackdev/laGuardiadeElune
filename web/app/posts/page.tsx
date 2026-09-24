import Link from "next/link";
import PostTile from "../components/PostTile";
import { CATEGORIES, getCategoryStyle, type Post } from "@/lib/posts";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const res = await fetch("http://localhost:8000/posts/", { cache: "no-store" });
  const posts: Post[] = res.ok ? await res.json() : [];
  const filtered = category
    ? posts.filter((p) => p.category?.toLowerCase() === category.toLowerCase())
    : posts;
  const active = category ? getCategoryStyle(category) : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold">
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

        {filtered.length === 0 ? (
          <p className="text-gray-500 py-16 text-center">
            Aún no hay publicaciones en esta sección.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filtered.map((post) => (
              <li key={post.id}>
                <PostTile post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
