import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/app/components/Breadcrumb";
import MythicRunCard from "@/app/components/MythicRunCard";
import { apiUrl } from "@/lib/api";
import { mythicToPost, type MythicRun } from "@/lib/mythic-board";
import { buildShareMetadata } from "@/lib/seo";

async function loadRun(id: string): Promise<MythicRun | null> {
  const res = await fetch(apiUrl(`/points/mythic-plus/${encodeURIComponent(id)}`), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const run = await loadRun(id);
  if (!run) return { title: "Mítica no encontrada" };
  const post = mythicToPost(run);
  return buildShareMetadata({
    title: post.title,
    description: post.subtitle || post.title,
    path: `/posts/miticas/${run.id}`,
    image: run.dungeon_image_url,
    type: "article",
    publishedTime: run.completed_at,
  });
}

export default async function MythicRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await loadRun(id);

  if (!run) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Esta mítica no está publicada.</p>
          <Link href="/posts?category=miticas" className="text-yellow-400 hover:underline">
            Volver a Míticas+
          </Link>
        </div>
      </main>
    );
  }

  const title = mythicToPost(run).title;

  return (
    <main className="min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { href: "/posts", label: "Tablón" },
            { href: "/posts?category=miticas", label: "Míticas+" },
            { label: title },
          ]}
        />
        <MythicRunCard run={run} />
      </div>
    </main>
  );
}
