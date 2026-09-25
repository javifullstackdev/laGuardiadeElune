import Link from "next/link";
import type { WikiListItem } from "@/lib/wiki";

export default function WikiTile({ item }: { item: WikiListItem }) {
  return (
    <Link
      href={`/personajes/${encodeURIComponent(item.realm)}/${encodeURIComponent(item.name)}`}
      className="group relative flex flex-col justify-end h-full min-h-[168px] rounded-[4px] overflow-hidden border border-white/10 bg-[#111827] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.28)] transition-[transform,box-shadow] duration-300 ease-out"
    >
      {item.cover_url && (
        <div className="absolute inset-y-0 right-0 w-[58%] pointer-events-none" aria-hidden>
          <img
            src={item.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[50%_8%] opacity-50"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #111827 0%, rgba(17,24,39,0.88) 28%, rgba(17,24,39,0.35) 58%, transparent 80%)",
            }}
          />
        </div>
      )}
      <div className="relative z-10 flex flex-col flex-1 px-4 pt-3 pb-4 max-w-[70%]">
        <h3 className="font-bold text-[15px] leading-snug text-white line-clamp-2">
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
