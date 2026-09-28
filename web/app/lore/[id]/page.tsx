import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { formatDate, textToParagraphs } from "@/lib/posts";
import ShareBar from "../../components/ShareBar";
import Breadcrumb from "@/app/components/Breadcrumb";
import Parchment from "@/app/components/ui/Parchment";
import { characterSignature, type StoryPublic } from "@/lib/stories";
import { relationLabel } from "@/lib/relations";
import StoryScene from "../StoryScene";

function highlightNames(text: string, names: string[]) {
  if (!names.length) return text;
  const escaped = names
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    names.some((n) => n.toLowerCase() === part.toLowerCase()) ? (
      <span key={`${part}-${i}`} className="text-[#5c2a78] font-semibold">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function ScrollSection({
  title,
  text,
  names,
}: {
  title?: string;
  text: string | null;
  names: string[];
}) {
  if (!text?.trim()) return null;
  return (
    <section>
      {title ? <h2>{title}</h2> : null}
      {textToParagraphs(text).map((p, i) => (
        <p key={i}>{highlightNames(p, names)}</p>
      ))}
    </section>
  );
}

function StoryParchment({
  story,
  actions,
}: {
  story: StoryPublic;
  actions?: ReactNode;
}) {
  const names = story.relations.map((r) => r.name);
  const hasBio = Boolean(story.biography?.trim());
  const hasPers = Boolean(story.personality?.trim());
  return (
    <Parchment
      title={story.title}
      titleFont="display"
      author={characterSignature(story) || story.author_username}
      actions={actions}
    >
      <ScrollSection text={story.biography} names={names} />
      <ScrollSection
        title={hasBio ? "Personalidad" : undefined}
        text={story.personality}
        names={names}
      />
      <ScrollSection
        title={hasBio || hasPers ? "Aspecto físico" : undefined}
        text={story.appearance}
        names={names}
      />
    </Parchment>
  );
}

export default async function LoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const res = await fetch(`http://localhost:8000/stories/${id}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
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

  const story: StoryPublic = await res.json();
  const hasLore = Boolean(story.biography || story.personality || story.appearance);
  const crumbs = [
    { href: "/", label: "Inicio" },
    { href: "/lore", label: "Historias" },
    { label: story.title },
  ];
  const byline = [
    story.character_name,
    story.character_realm,
    story.author_username,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="relative text-white">
      <StoryScene coverUrl={story.cover_url}>
        <section className="relative z-10 sm:hidden h-[calc(100dvh-3rem)]">
          <div className="absolute top-0 inset-x-0 z-30 px-4 pt-3">
            <Breadcrumb className="mb-0" items={crumbs} />
          </div>
          <div className="absolute top-14 inset-x-0 bottom-0 flex flex-col">
            <h1 className="px-5 mb-1 text-center text-[#f3eee4]">
              <span className="block font-quest-display text-[2rem] font-bold leading-tight tracking-wide">
                {story.title}
              </span>
            </h1>
            <p className="px-5 mb-3 text-center text-sm text-white/70">{byline}</p>
            {story.published_at && (
              <p className="px-5 -mt-2 mb-2 text-center text-xs text-white/50">
                {formatDate(story.published_at)}
              </p>
            )}
            {hasLore && (
              <div className="wiki-mobile-lore min-h-0 flex-1 px-2 flex items-end justify-center">
                <StoryParchment
                  story={story}
                  actions={
                    (!story.status || story.status === "approved") ? (
                      <ShareBar
                        variant="parchment"
                        targetType="story"
                        targetId={story.id}
                        title={story.title}
                        loggedIn={!!token}
                      />
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        </section>

        <div className="relative z-10 hidden sm:block">
          <div className="max-w-7xl mx-auto px-4 pt-7 pb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <Breadcrumb className="mb-0" items={crumbs} />
              {story.status && story.status !== "approved" && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 shrink-0">
                  {story.status === "pending" ? "Pendiente de revisión" : "Rechazada"}
                </span>
              )}
            </div>
            <h1 className="sr-only">{story.title}</h1>
            {hasLore && (
              <div className="max-w-full">
                <StoryParchment
                  story={story}
                  actions={
                    (!story.status || story.status === "approved") ? (
                      <ShareBar
                        variant="parchment"
                        targetType="story"
                        targetId={story.id}
                        title={story.title}
                        loggedIn={!!token}
                      />
                    ) : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </StoryScene>

      {story.relations.length > 0 && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <section className="pt-2 max-w-2xl">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Relaciones</h2>
            <ul className="space-y-2">
              {story.relations.map((r) => (
                <li key={`${r.name}-${r.realm}`} className="text-sm text-gray-300">
                  <span className="text-white">{r.name}</span>
                  {" · "}
                  {relationLabel(r.relation_type)}
                  {r.met_at ? ` · se conocieron en ${r.met_at}` : ""}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
