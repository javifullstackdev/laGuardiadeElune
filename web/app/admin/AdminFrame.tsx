"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ADMIN_NAV, adminNavCurrent } from "./nav";

function NavLink({
  href,
  title,
  pathname,
  compact = false,
}: {
  href: string;
  title: string;
  pathname: string;
  compact?: boolean;
}) {
  const current = adminNavCurrent(pathname, href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={
        compact
          ? `shrink-0 rounded-md px-3 py-1.5 text-sm ${
              current ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`
          : `block rounded-md px-3 py-2 text-sm ${
              current
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`
      }
    >
      {title}
    </Link>
  );
}

export default function AdminFrame({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="lg:flex lg:min-h-[calc(100svh-3rem)]">
      <aside className="sticky top-12 hidden h-[calc(100svh-3rem)] w-60 shrink-0 overflow-y-auto border-r border-gray-800 bg-[#0b0b0b] lg:block">
        <div className="px-4 pb-3 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
            Administración
          </p>
          <p className="mt-1 truncate text-sm text-yellow-400">{username}</p>
        </div>
        <nav className="flex flex-col gap-5 px-3 pb-8" aria-label="Secciones de administración">
          {ADMIN_NAV.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] uppercase tracking-wider text-gray-600">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} {...item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-12 z-30 flex gap-1 overflow-x-auto border-b border-gray-800 bg-[#0b0b0b] px-3 py-2 lg:hidden">
          {ADMIN_NAV.flatMap((group) => group.items).map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} compact />
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
