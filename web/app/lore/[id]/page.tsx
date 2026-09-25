import Link from "next/link";
import { cookies } from "next/headers";
import { formatDate, textToParagraphs } from "@/lib/posts";
import ShareBar from "../../components/ShareBar";
import StoryDeleteButton from "../../admin/stories/StoryDeleteButton";
import type { StoryPublic } from "@/lib/stories";
import { relationLabel } from "@/lib/relations";

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
      <span key={`${part}-${i}`} className="text-purple-200">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function Block({ title, text, names }: { title: string; text: string | null; names: string[] }) {
  if (!text?.trim()) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest text-gray-500">{title}</h2>
      {textToParagraphs(text).map((p, i) => (
        <p key={i} className="text-gray-300 leading-relaxed text-[1.05rem]">
          {highlightNames(p, names)}
        </p>
      ))}
    </section>
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
  const [res, me] = await Promise.all([
    fetch(`http://localhost:8000/stories/${id}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    token
      ? fetch("http://localhost:8000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).then((r) => (r.ok ? r.json() : null))
      : Promise.resolve(null),
  ]);

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
  const canDelete = me?.role === "admin" || me?.role === "officer";

  return (
    <main className="min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/lore"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8 inline-block"
        >
          Volver a historias
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Historia
          </span>
          {story.status && story.status !== "approved" && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 text-amber-300">
              {story.status === "pending" ? "Pendiente de revisión" : "Rechazada"}
            </span>
          )}
          {story.published_at && (
            <span className="text-sm text-gray-500">{formatDate(story.published_at)}</span>
          )}
        </div>

        <h1 className="text-4xl font-bold leading-tight mb-3">{story.title}</h1>
        <div className="flex items-start justify-between gap-4 mb-8">
          <p className="text-gray-400">
            {story.character_name}
            {story.character_realm ? ` · ${story.character_realm}` : ""}
            {" · "}
            {story.author_username}
          </p>
          {canDelete && <StoryDeleteButton storyId={story.id} redirectTo="/lore" />}
        </div>

        {story.cover_url && (
          <div className="mb-8 -mx-4 sm:mx-0 overflow-hidden rounded-xl border border-gray-800">
            <img src={story.cover_url} alt="" className="w-full max-h-[420px] object-cover object-top" />
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-purple-500/40 to-transparent mb-8" />

        <div className="space-y-10">
          <Block title="Historia" text={story.biography} names={story.relations.map((r) => r.name)} />
          <Block title="Personalidad" text={story.personality} names={story.relations.map((r) => r.name)} />
          <Block title="Aspecto físico" text={story.appearance} names={story.relations.map((r) => r.name)} />
        </div>

        {story.relations.length > 0 && (
          <section className="mt-10 pt-6 border-t border-gray-800">
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
        )}

        {(!story.status || story.status === "approved") && (
          <ShareBar
            targetType="story"
            targetId={story.id}
            title={story.title}
            loggedIn={!!token}
          />
        )}
      </div>
    </main>
  );
}
