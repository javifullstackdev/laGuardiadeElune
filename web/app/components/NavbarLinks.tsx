"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  external?: boolean;
};

export default function NavbarLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex items-stretch h-full gap-7">
      {items.map((item) => {
        const active =
          !item.external &&
          (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
        const className = `relative flex items-center text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors ${
          active ? "text-white" : "text-gray-400 hover:text-white"
        }`;
        const underline = active ? (
          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
        ) : null;

        if (item.external) {
          return (
            <a key={item.href} href={item.href} className={className}>
              {item.label}
            </a>
          );
        }

        if (item.href.startsWith("/api/")) {
          return (
            <a key={item.href} href={item.href} className={className}>
              {item.label}
            </a>
          );
        }

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.label}
            {underline}
          </Link>
        );
      })}
    </div>
  );
}
