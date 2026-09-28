import Link from "next/link";
import { characterSignature, storyExcerpt, type StoryPublic } from "@/lib/stories";

export default function StoryTile({ story }: { story: StoryPublic }) {
  const excerpt = storyExcerpt(story);
  const signature = characterSignature(story);

  return (
    <Link
      href={`/lore/${story.id}`}
      className="group flex flex-col h-full rounded-[4px] overflow-hidden border border-white/10 bg-[#111827] hover:bg-[#1a2233] transition-colors"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-[#111]">
        {story.cover_url ? (
          <img
            src={story.cover_url}
            alt=""
            className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950 to-gray-900" />
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-purple-500 text-white">
          Historia
        </span>
      </div>
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        <h3 className="font-quest font-bold text-[15px] leading-snug text-white line-clamp-2">
          {story.title}
        </h3>
        {excerpt && (
          <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2">{excerpt}</p>
        )}
        {signature && (
          <p className="mt-auto pt-4 text-xs font-quest font-semibold text-white text-right truncate">
            {signature}
          </p>
        )}
      </div>
    </Link>
  );
}
