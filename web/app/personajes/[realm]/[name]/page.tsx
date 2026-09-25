import Link from "next/link";
import { textToParagraphs } from "@/lib/posts";
import { relationLabel } from "@/lib/relations";
import { classLabel, raceLabel, factionLabel, classColor } from "@/lib/wow";
import type { WikiCharacter } from "@/lib/wiki";

function Block({ title, text }: { title: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest text-gray-500">{title}</h2>
      {textToParagraphs(text).map((p, i) => (
        <p key={i} className="text-gray-300 leading-relaxed text-[1.05rem]">
          {p}
        </p>
      ))}
    </section>
  );
}

export default async function WikiCharacterPage({
  params,
}: {
  params: Promise<{ realm: string; name: string }>;
}) {
  const { realm, name } = await params;
  const res = await fetch(
    `http://localhost:8000/wiki/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <main className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Esta ficha aún no es pública.</p>
          <Link href="/personajes" className="text-yellow-400 hover:underline">
            Volver a personajes
          </Link>
        </div>
      </main>
    );
  }

  const char: WikiCharacter = await res.json();
  const color = classColor(char.wow_class);
  const facts = [
    { label: "Título", value: char.title },
    { label: "Raza", value: raceLabel(char.race) },
    { label: "Clase", value: classLabel(char.wow_class) },
    { label: "Facción", value: factionLabel(char.faction) },
    { label: "Edad", value: char.age_lore ? `${char.age_lore} años` : null },
    { label: "Origen", value: char.origin },
    { label: "Residencia", value: char.residence },
  ].filter((f) => f.value);

  return (
    <main className="relative min-h-screen text-white overflow-hidden">
      {char.cover_url && (
        <div
          className="absolute inset-y-0 right-0 w-[58%] pointer-events-none select-none hidden sm:block"
          style={{ zIndex: 0 }}
          aria-hidden
        >
          <img
            src={char.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[50%_5%]"
            style={{ opacity: 0.34 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: [
                "linear-gradient(to right, #030712 0%, #030712 6%, rgba(3,7,18,0.92) 18%, rgba(3,7,18,0.72) 32%, rgba(3,7,18,0.40) 48%, rgba(3,7,18,0.10) 65%, transparent 78%)",
                "linear-gradient(to top, #030712 0%, rgba(3,7,18,0.7) 12%, transparent 30%)",
                "linear-gradient(to bottom, rgba(3,7,18,0.5) 0%, transparent 20%)",
              ].join(", "),
            }}
          />
        </div>
      )}

      <div className="relative z-10">
        {char.cover_url && (
          <div className="sm:hidden relative h-36 overflow-hidden">
            <img
              src={char.cover_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-[50%_10%]"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, transparent 40%, #030712 100%)" }}
            />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
          <Link
            href="/personajes"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8 inline-block"
          >
            Volver a personajes
          </Link>

          <div className="max-w-2xl">
            {char.title && (
              <p className="text-sm mb-1" style={{ color: "#DDB96A" }}>{char.title}</p>
            )}
            <h1
              className="text-4xl font-bold leading-tight mb-2"
              style={{ color, textShadow: `0 0 24px ${color}35` }}
            >
              {char.display_name}
            </h1>
            <p className="text-gray-500 mb-6">
              {char.realm}
              {" · "}
              {char.author_username}
            </p>

            {facts.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-10 max-w-xl">
                {facts.map((f) => (
                  <div key={f.label} className="bg-gray-900/70 rounded-lg px-3 py-2 border border-gray-800/50">
                    <p className="text-xs text-gray-600 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-gray-100 truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-10">
              <Block title="Biografía" text={char.biography} />
              <Block title="Personalidad" text={char.personality} />
              <Block title="Aspecto físico" text={char.appearance} />
            </div>
          </div>

          {char.related.length > 0 && (
            <section className="mt-14 pt-8 border-t border-gray-800 max-w-4xl">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">
                Aparecen en sus historias
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {char.related.map((rel) => {
                  const inner = (
                    <>
                      <div className="aspect-[4/5] overflow-hidden bg-gray-900">
                        {rel.cover_url ? (
                          <img src={rel.cover_url} alt="" className="w-full h-full object-cover object-top" />
                        ) : (
                          <div className="w-full h-full bg-gray-800" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm text-white truncate">{rel.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {rel.relation_types.map(relationLabel).join(" · ") || `${rel.story_count} relatos`}
                        </p>
                      </div>
                    </>
                  );
                  return (
                    <li key={`${rel.name}-${rel.realm}`} className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/40">
                      {rel.has_page ? (
                        <Link
                          href={`/personajes/${encodeURIComponent(rel.realm)}/${encodeURIComponent(rel.name)}`}
                          className="block hover:bg-gray-800/40"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {char.stories.length > 0 && (
            <section className="mt-10 pt-8 border-t border-gray-800 max-w-2xl">
              <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Relatos</h2>
              <ul className="space-y-2">
                {char.stories.map((story) => (
                  <li key={story.id}>
                    <Link href={`/lore/${story.id}`} className="text-sm text-yellow-400 hover:underline">
                      {story.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
