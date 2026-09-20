import Link from "next/link";
import { getCategoryStyle, formatDate, textToParagraphs } from "@/lib/posts";

type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
  subtitle?: string | null;
  cover_url?: string | null;
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(`http://localhost:8000/posts/${id}`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Post no encontrado.</p>
          <Link href="/" className="text-yellow-400 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const post: Post = await res.json();
  const cat = getCategoryStyle(post.category);
  const paragraphs = textToParagraphs(post.content);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8 inline-block"
        >
          &larr; Volver a posts
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
            {cat.label}
          </span>
          <span className="text-sm text-gray-500">{formatDate(post.published_at)}</span>
        </div>

        <h1 className="text-4xl font-bold leading-tight mb-3">{post.title}</h1>
        {post.subtitle && (
          <p className="text-lg text-gray-400 mb-6">{post.subtitle}</p>
        )}

        {post.cover_url && (
          <div className="mb-8 -mx-4 sm:mx-0 overflow-hidden rounded-xl border border-gray-800">
            <img src={post.cover_url} alt="" className="w-full max-h-[420px] object-cover" />
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-yellow-500/40 to-transparent mb-8" />

        <div className="space-y-5">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="text-gray-300 leading-relaxed text-[1.05rem]">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
