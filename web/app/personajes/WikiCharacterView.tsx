import Link from "next/link";
import type { ReactNode } from "react";
import { textToParagraphs } from "@/lib/posts";
import { relationLabel } from "@/lib/relations";
import { classLabel, raceLabel, factionLabel, factionColor } from "@/lib/wow";
import type { WikiCharacter } from "@/lib/wiki";
import Breadcrumb from "@/app/components/Breadcrumb";
import ShareBar from "@/app/components/ShareBar";
import Parchment from "@/app/components/ui/Parchment";
import WikiMobileStage from "@/app/personajes/[realm]/[name]/WikiMobileStage";

function ScrollSection({ title, text }: { title?: string; text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section>
      {title ? <h2>{title}</h2> : null}
      {textToParagraphs(text).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </section>
  );
}

function CharacterHeading({
  prefixTitle,
  displayName,
  title,
  className,
}: {
  prefixTitle?: string | null;
  displayName: string;
  title?: string | null;
  className?: string;
}) {
  return (
    <h1 className={className ?? "text-[#f3eee4]"}>
      {prefixTitle ? (
        <span className="block font-quest text-[1.15rem] font-semibold tracking-wide opacity-90">
          {prefixTitle}
        </span>
      ) : null}
      <span className="mt-1 block font-quest-display text-[2rem] font-bold leading-tight tracking-wide">
        {displayName}
      </span>
      {title ? (
        <span className="mt-1.5 block font-quest text-[1.2rem] font-semibold leading-snug tracking-wide text-[#e4ddd0]">
          {title}
        </span>
      ) : null}
    </h1>
  );
}

function LoreParchment({
  char,
  actions,
}: {
  char: WikiCharacter;
  actions?: ReactNode;
}) {
  const title = char.biography
    ? "Biografía"
    : char.personality
      ? "Personalidad"
      : "Aspecto físico";
  return (
    <Parchment title={title} actions={actions}>
      <ScrollSection text={char.biography} />
      <ScrollSection
        title={char.biography ? "Personalidad" : undefined}
        text={char.personality}
      />
      <ScrollSection
        title={char.biography || char.personality ? "Aspecto físico" : undefined}
        text={char.appearance}
      />
    </Parchment>
  );
}

function CharacterShareBar({
  char,
  loggedIn,
}: {
  char: WikiCharacter;
  loggedIn: boolean;
}) {
  return (
    <ShareBar
      variant="parchment"
      targetType="character"
      targetId={char.id}
      title={char.display_name}
      loggedIn={loggedIn}
      shareUrl={`/personajes/${encodeURIComponent(char.realm)}/${encodeURIComponent(char.name)}`}
    />
  );
}

export default function WikiCharacterView({
  char,
  preview,
  loggedIn = false,
  onDismiss,
}: {
  char: WikiCharacter;
  preview?: boolean;
  loggedIn?: boolean;
  onDismiss?: () => void;
}) {
  const facts = (
    [
      { label: "Raza", value: raceLabel(char.race, char.gender) },
      { label: "Clase", value: classLabel(char.wow_class, char.gender) },
      { label: "Facción", value: factionLabel(char.faction), color: factionColor(char.faction) },
      { label: "Edad", value: char.age_lore ? `${char.age_lore} años` : null },
      { label: "Origen", value: char.origin },
      { label: "Residencia", value: char.residence },
    ] as { label: string; value: string | null; color?: string }[]
  ).filter((f): f is { label: string; value: string; color?: string } => Boolean(f.value));
  const hasLore = Boolean(char.biography || char.personality || char.appearance);
  const crumbs = preview
    ? [
        { label: "Inicio" },
        { label: "Personajes" },
        { label: char.display_name },
      ]
    : [
        { href: "/", label: "Inicio" },
        { href: "/personajes", label: "Personajes" },
        { label: char.display_name },
      ];

  const shareActions = <CharacterShareBar char={char} loggedIn={loggedIn} />;
  const lore = hasLore ? <LoreParchment char={char} actions={shareActions} /> : null;

  return (
    <div className="relative text-white">
      {char.cover_url && (
        <div
          className="fixed inset-y-0 right-0 w-[58%] pointer-events-none select-none hidden sm:block"
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

      <WikiMobileStage
        coverUrl={char.cover_url}
        prefixTitle={char.prefix_title}
        displayName={char.display_name}
        title={char.title}
        facts={facts}
        crumbs={crumbs}
        onBack={onDismiss}
      >
        {lore}
      </WikiMobileStage>

      <div className="relative z-10 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 pt-7 pb-6">
          <Breadcrumb className="mb-4" items={crumbs} onBack={onDismiss} />

          <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
            {hasLore && (
              <div className="shrink-0 max-w-full">
                <LoreParchment char={char} actions={shareActions} />
              </div>
            )}

            <aside className="w-full flex-1 min-w-0 lg:self-end lg:mb-16">
              <CharacterHeading
                className="mb-6 text-center text-[#f3eee4]"
                prefixTitle={char.prefix_title}
                displayName={char.display_name}
                title={char.title}
              />
              {facts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="rounded-lg px-3 py-2.5 border border-white/20 bg-white/15 backdrop-blur-[2px]"
                    >
                      <p className="text-xs text-white/55 mb-0.5">{f.label}</p>
                      <p
                        className="text-sm font-medium truncate text-white"
                        style={f.color ? { color: f.color } : undefined}
                      >
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {char.related.length > 0 && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
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
                      <p className="font-quest-display text-sm font-bold tracking-wide text-white truncate">{rel.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {rel.relation_types.map(relationLabel).join(" · ") || `${rel.story_count} relatos`}
                      </p>
                    </div>
                  </>
                );
                return (
                  <li key={`${rel.name}-${rel.realm}`} className="rounded-lg overflow-hidden border border-gray-800 bg-gray-900/40">
                    {rel.has_page && !preview ? (
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
        </div>
      )}
    </div>
  );
}
