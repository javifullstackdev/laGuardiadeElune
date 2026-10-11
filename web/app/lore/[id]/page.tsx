import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { textToParagraphs } from "@/lib/posts";
import ShareBar from "../../components/ShareBar";
import Breadcrumb from "@/app/components/Breadcrumb";
import Parchment from "@/app/components/ui/Parchment";
import { characterSignature, type StoryPublic } from "@/lib/stories";
import { relationLabel } from "@/lib/relations";
import { loadWikiChar } from "@/lib/wiki";
import { isHorde } from "@/lib/wow";
import StoryScene from "../StoryScene";

import { apiUrl } from "@/lib/api";
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
  isHordeChar = false,
}: {
  story: StoryPublic;
  actions?: ReactNode;
  isHordeChar?: boolean;
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
      isHorde={isHordeChar}
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

async function loadStory(
  id: string,
  token?: string,
): Promise<StoryPublic | null> {
  const res = await fetch(apiUrl(`/stories/${id}`), {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const story = await loadStory(id);
  if (!story) return { title: "Historia no encontrada" };
  const description =
    (story.biography || story.personality || story.appearance || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 155) || `Historia de ${story.title} en La Guardia de Elune.`;
  return {
    title: story.title,
    description,
    openGraph: {
      title: story.title,
      description,
      type: "article",
      images: story.cover_url
        ? [{ url: story.cover_url, alt: story.title }]
        : undefined,
    },
  };
}

export default async function LoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const story = await loadStory(id, token);

  if (!story) {
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
  const hasLore = Boolean(story.biography || story.personality || story.appearance);
  const wikiChar =
    story.character_realm && story.character_name
      ? await loadWikiChar(story.character_realm, story.character_name)
      : null;
  const isHordeStory = isHorde(
    story.character_faction ?? wikiChar?.faction,
    story.character_race ?? wikiChar?.race,
  );
  const crumbs = [
    { href: "/", label: "Inicio" },
    { href: "/lore", label: "Historias" },
    { label: story.title },
  ];
  const shareActions =
    !story.status || story.status === "approved" ? (
      <ShareBar
        variant="parchment"
        targetType="story"
        targetId={story.id}
        title={story.title}
        loggedIn={!!token}
      />
    ) : undefined;

  return (
    <main className="relative text-white">
      <StoryScene coverUrl={story.cover_url} coverAlt={story.title}>
        {/* Móvil: pergamino a pantalla completa (como ficha de personaje) */}
        <section className="relative z-10 sm:hidden h-[calc(100dvh-3rem)] overflow-hidden">
          <div className="absolute top-0 inset-x-0 z-30 px-4 pt-3 pointer-events-none">
            <div className="pointer-events-auto">
              <Breadcrumb className="mb-0" items={crumbs} />
            </div>
          </div>
          {hasLore ? (
            <div className="wiki-mobile-lore absolute inset-0 overflow-hidden animate-parchment-up">
              <StoryParchment story={story} actions={shareActions} isHordeChar={isHordeStory} />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <p className="text-center text-sm text-white/60">
                Esta historia aún no tiene texto publicado.
              </p>
            </div>
          )}
        </section>

        <div className="relative z-10 hidden sm:block h-full">
          {/* 1. Mismo padding izquierdo que en personajes */}
          <div className="h-full flex flex-col px-4 pt-6 lg:pl-[clamp(25rem,28vw,32rem)] lg:pr-20">
            <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
              <Breadcrumb className="mb-0" items={crumbs} jsonLd={false} />
              {story.status && story.status !== "approved" && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300 shrink-0">
                  {story.status === "pending" ? "Pendiente de revisión" : "Rechazada"}
                </span>
              )}
            </div>
            <h1 className="sr-only">{story.title}</h1>
            {hasLore && (
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch gap-5 lg:gap-8">
                {/* 2. Alineación inferior y animación de entrada */}
                <div className="min-h-0 shrink-0 lg:self-end animate-parchment-up story-large-parchment">
                  <StoryParchment story={story} actions={shareActions} isHordeChar={isHordeStory} />
                </div>
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