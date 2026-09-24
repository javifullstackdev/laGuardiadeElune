import Link from "next/link";
import { getCategoryStyle, postSubtitle, formatDate, type Post } from "@/lib/posts";

export default function PostTile({ post }: { post: Post }) {
  const cat = getCategoryStyle(post.category);
  const subtitle = postSubtitle(post);

  return (
      <Link
        href={`/posts/${post.id}`}
        className="group flex flex-col h-full rounded-[4px] overflow-hidden border border-white/10 bg-[#111827] hover:bg-[#1a2233] transition-colors"
      >
        <div className="relative aspect-[16/11] overflow-hidden bg-[#111]">
          {post.cover_url ? (
            <img
              src={post.cover_url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          {post.category && (
            <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${cat.flag}`}>
              {cat.label}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
          <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-gray-500">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-yellow-500/90 shrink-0" />
            <span className="truncate">La Guardia de Elune</span>
          </p>
          <h3 className="mt-1.5 font-bold text-[15px] leading-snug text-white line-clamp-2">
            {post.title}
          </h3>
          {subtitle && (
            <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2">
              {subtitle}
            </p>
          )}
          <p className="mt-auto pt-4 text-sm font-semibold text-white">
            {formatDate(post.published_at)}
          </p>
        </div>
      </Link>
  );
}
