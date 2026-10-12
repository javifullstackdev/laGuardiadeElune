import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCategoryStyle, formatDate } from "@/lib/posts";
import Breadcrumb from "@/app/components/Breadcrumb";
import ShareBar from "../../components/ShareBar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { apiUrl } from "@/lib/api";
type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
  subtitle?: string | null;
  cover_url?: string | null;
};

async function loadPost(id: string): Promise<Post | null> {
  const res = await fetch(apiUrl(`/posts/${id}`), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) return { title: "Post no encontrado" };
  const description =
    post.subtitle?.trim() ||
    post.content.replace(/\s+/g, " ").trim().slice(0, 155) ||
    post.title;
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.published_at,
      images: post.cover_url ? [{ url: post.cover_url, alt: post.title }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const post = await loadPost(id);

  if (!post) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Post no encontrado.</p>
          <Link href="/" className="text-yellow-400 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const cat = getCategoryStyle(post.category);

  return (
    <main className="min-h-screen text-white">
      <article className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-12">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { href: "/posts", label: "Tablón" },
            { label: post.title },
          ]}
        />

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
            {cat.label}
          </span>
          <span className="text-sm text-gray-500">{formatDate(post.published_at)}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-quest-display font-bold leading-tight mb-3">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="text-base sm:text-lg text-gray-400 mb-6">{post.subtitle}</p>
        )}

        {post.cover_url && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-gray-800">
            <img
              src={post.cover_url}
              alt={`Portada: ${post.title}`}
              className="w-full max-h-[min(65svh,720px)] object-cover"
            />
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-yellow-500/40 to-transparent mb-8" />

        <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-[1.05rem] sm:prose-p:text-lg prose-headings:font-quest-display prose-headings:text-yellow-400 prose-a:text-yellow-500 hover:prose-a:text-yellow-400">
<<<<<<< Updated upstream
          <ReactMarkdown>
            {post.content}
=======
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content.replace(/\\n/g, '\n')}
>>>>>>> Stashed changes
          </ReactMarkdown>
        </div>

        <ShareBar
          targetType="post"
          targetId={post.id}
          title={post.title}
          loggedIn={!!token}
        />
      </article>
    </main>
  );
}
