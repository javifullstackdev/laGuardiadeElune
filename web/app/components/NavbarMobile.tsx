"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
  style?: "admin" | "logout" | "login" | "default";
  external?: boolean;
};

export default function NavbarMobile({
  links,
  username,
}: {
  links: NavLink[];
  username: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        className="md:hidden text-gray-300 hover:text-white transition-colors p-1"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? (
          // X
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // ≡
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Drawer desplegable */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-64 bg-gray-900 border-l border-gray-800 flex flex-col md:hidden shadow-2xl">
            {/* Header del panel */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <span className="font-bold text-white truncate">{username ?? "Menú"}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
              {links.map((link) => {
                const base = "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors";
                if (link.style === "admin") {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`${base} bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 hover:bg-yellow-500/25`}
                    >
                      {link.label}
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
                // default
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`${base} text-gray-300 hover:text-white hover:bg-gray-800`}
                  >
                    {link.label}
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
