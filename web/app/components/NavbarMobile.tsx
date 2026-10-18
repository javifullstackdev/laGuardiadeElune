"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  style?: "admin" | "logout" | "login" | "default";
  external?: boolean;
  badge?: number;
};

function Label({ link }: { link: NavLink }) {
  return (
    <>
      {link.label}
      {(link.badge ?? 0) > 0 && (
        <span className="ml-2 min-w-[1.1rem] h-4 px-1 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] leading-4 text-center">
          {link.badge! > 9 ? "9+" : link.badge}
        </span>
      )}
    </>
  );
}

export default function NavbarMobile({
  links,
  username,
}: {
  links: NavLink[];
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigation completes — avoids unmounting the Link mid-tap
  // (which can drop the click through to whatever is underneath, e.g. home).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="md:hidden text-gray-300 hover:text-white transition-colors p-1"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed top-0 right-0 bottom-0 z-[70] w-64 bg-[#0b0b0b] border-l border-gray-800 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <span className="font-bold text-white truncate">{username ?? "Menú"}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
              {links.map((link) => {
                const base =
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors";
                if (link.style === "admin") {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${base} bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 hover:bg-yellow-500/25`}
                    >
                      <Label link={link} />
                    </Link>
                  );
                }
                if (link.style === "logout") {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`${base} bg-red-600/15 text-red-400 border border-red-600/25 hover:bg-red-600/25`}
                    >
                      {link.label}
                    </a>
                  );
                }
                if (link.style === "login") {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`${base} bg-indigo-600 hover:bg-indigo-700 text-white justify-center`}
                    >
                      {link.label}
                    </a>
                  );
                }
                if (link.external || link.href.startsWith("/api/") || link.href.startsWith("http")) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`${base} text-gray-300 hover:text-white hover:bg-gray-800`}
                    >
                      {link.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${base} text-gray-300 hover:text-white hover:bg-gray-800`}
                  >
                    <Label link={link} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
