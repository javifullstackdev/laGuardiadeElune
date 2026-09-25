import Link from "next/link";
import { formatDate } from "@/lib/posts";
import { storyExcerpt, type StoryPublic } from "@/lib/stories";

export default function StoryTile({ story }: { story: StoryPublic }) {
  const excerpt = storyExcerpt(story);

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
        <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-gray-500">
          <span className="w-3.5 h-3.5 rounded-[3px] bg-purple-500/90 shrink-0" />
          <span className="truncate">{story.author_username}</span>
        </p>
        <h3 className="mt-1.5 font-bold text-[15px] leading-snug text-white line-clamp-2">
          {story.title}
        </h3>
        {excerpt && (
          <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2">{excerpt}</p>
        )}
        <p className="mt-auto pt-4 text-sm font-semibold text-white">
          {story.published_at ? formatDate(story.published_at) : ""}
        </p>
      </div>
    </Link>
  );
}
