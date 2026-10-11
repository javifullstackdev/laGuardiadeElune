"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/site";

const LEGAL = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terminos", label: "Términos" },
] as const;

function isStoryOrCharacterView(pathname: string | null): boolean {
  if (!pathname) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  return (
    segments[0] === "personajes" ||
    segments[0] === "lore" ||
    segments[0] === "characters"
  );
}

export default function SiteFooter() {
  const pathname = usePathname();

  if (isStoryOrCharacterView(pathname)) {
    return null;
  }

  return (
    <footer className="relative z-10 border-t border-gray-900 bg-[#080808] text-gray-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="min-w-0">
            <p className="font-quest text-sm font-semibold tracking-wide text-gray-400">
              {SITE_NAME}
            </p>
            <p className="mt-2 text-xs leading-relaxed max-w-md">
              Hermandad de World of Warcraft. No afiliada a Blizzard
              Entertainment ni a Discord.
            </p>
          </div>
          <nav
            aria-label="Información legal"
            className="flex flex-wrap gap-x-4 gap-y-2 text-xs"
          >
            {LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-gray-300 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-6 text-[11px] text-gray-600">
          World of Warcraft® © Blizzard Entertainment. Todos los derechos
          reservados.
        </p>
      </div>
    </footer>
  );
}
