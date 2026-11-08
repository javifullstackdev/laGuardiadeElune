import Link from "next/link";
import { characterSignature, storyExcerpt, storyHref, type StoryPublic } from "@/lib/stories";

function cardLines(story: StoryPublic): string[] {
  return (story.card_lines ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 2);
}

export default function StoryTile({ story }: { story: StoryPublic }) {
  const excerpt = storyExcerpt(story);
  const signature = characterSignature(story);
  const lines = cardLines(story);

  return (
    <Link
      href={storyHref(story)}
      draggable={false}
      className="group flex flex-col h-full rounded-[4px] overflow-hidden border border-white/10 bg-[#111827] hover:bg-[#1a2233] transition-colors select-none [touch-action:pan-x_pan-y] [-webkit-touch-callout:none] [-webkit-user-drag:none]"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-[#111]">
        {story.cover_url ? (
          <img
            src={story.cover_url}
            alt={`Portada: ${story.title}`}
            draggable={false}
            className="w-full h-full object-cover object-top origin-top ease-out transition-transform duration-700 lg:group-hover:scale-[1.02] select-none pointer-events-none [-webkit-user-drag:none]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950 to-gray-900" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/35 transition-colors duration-700 ease-out lg:group-hover:bg-black/10" />
        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-purple-500 text-white">
          Historia
        </span>
      </div>
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        <h3
          className={`font-quest-display font-bold text-[15px] leading-snug tracking-wide text-white ${
            lines.length > 0 ? "" : "line-clamp-2"
          }`}
        >
          {lines.length > 0
            ? lines.map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))
            : story.title}
        </h3>
        <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2 min-h-[2.75em]">
          {excerpt || "\u00A0"}
        </p>
        {signature && (
          <p className="mt-auto pt-4 text-xs font-quest font-semibold text-white text-right truncate">
            {signature}
          </p>
        )}
      </div>
    </Link>
  );
}
