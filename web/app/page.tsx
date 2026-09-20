import Link from "next/link";
import { getCategoryStyle, formatDate } from "@/lib/posts";

type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
};

export default async function Home() {
  const res = await fetch("http://localhost:8000/posts/", { cache: "no-store" });
  const posts: Post[] = res.ok ? await res.json() : [];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 py-12 px-4 text-center">
        <h1 className="text-3xl font-bold">La Guardia de Elune</h1>
        <p className="text-gray-400 mt-2">Noticias, crónicas y anuncios de la hermandad</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>Aún no hay posts publicados.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post: Post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function PostCard({ post }: { post: Post }) {
  const cat = getCategoryStyle(post.category);
  const excerpt =
    post.content.length > 200
      ? post.content.slice(0, 200).trimEnd() + "…"
      : post.content;

  return (
    <li className="group rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors overflow-hidden">
      <Link href={`/posts/${post.id}`} className="block p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
            {cat.label}
          </span>
          <span className="text-xs text-gray-500">{formatDate(post.published_at)}</span>
        </div>
        <h2 className="text-xl font-bold group-hover:text-yellow-400 transition-colors mb-2">
          {post.title}
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">{excerpt}</p>
        <p className="text-yellow-500 text-sm mt-4 font-medium">Leer más →</p>
      </Link>
    </li>
  );
}
