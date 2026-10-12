import Link from "next/link";
import type { WikiListItem } from "@/lib/wiki";

export default function WikiTile({ item }: { item: WikiListItem }) {
  return (
    <Link
      href={`/personajes/${encodeURIComponent(item.realm)}/${encodeURIComponent(item.name)}`}
      draggable={false}
      className="group relative flex flex-col justify-end h-full min-h-[168px] rounded-[4px] overflow-hidden border border-white/10 bg-[#111827] select-none [-webkit-touch-callout:none] [-webkit-user-drag:none] sm:hover:-translate-y-0.5 sm:hover:shadow-[0_8px_20px_rgba(0,0,0,0.28)] transition-[transform,box-shadow] duration-300 ease-out"
    >
      {item.cover_url && (
        <div className="absolute inset-y-0 right-0 w-[58%] pointer-events-none select-none" aria-hidden>
          <img
            src={item.cover_url}
            alt={item.display_name}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover object-[50%_8%] opacity-50 select-none pointer-events-none [-webkit-user-drag:none]"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, #111827 0%, rgba(17,24,39,0.88) 28%, rgba(17,24,39,0.35) 58%, transparent 80%)",
            }}
          />
        </div>
      )}
      <div className="relative z-10 mt-auto flex flex-col px-4 pt-3 pb-4 max-w-[70%] select-none pointer-events-none">
        <h3 className="font-quest-display font-bold text-[17px] leading-snug tracking-wide text-white line-clamp-2">
          {item.display_name}
        </h3>
        {item.title && (
          <p className="mt-1 text-[10px] tracking-[0.14em] uppercase text-yellow-500/80 truncate">
            {item.title}
          </p>
        )}
        {item.excerpt && (
          <p className="mt-1.5 text-[13px] text-gray-400 leading-snug line-clamp-2">{item.excerpt}</p>
        )}
      </div>
    </Link>
  );
}
