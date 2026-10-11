import type { Metadata } from "next";
import { cookies } from "next/headers";
import Breadcrumb from "@/app/components/Breadcrumb";
import { loadWikiChar, type WikiCharacter, type WikiListItem, type WikiNeighbor } from "@/lib/wiki";
import WikiCharacterView from "@/app/personajes/WikiCharacterView";
import { apiUrl } from "@/lib/api";

function toNeighbor(item: WikiListItem): WikiNeighbor {
  return {
    href: `/personajes/${encodeURIComponent(item.realm)}/${encodeURIComponent(item.name)}`,
    coverUrl: item.cover_url,
    displayName: item.display_name,
    title: item.title,
  };
}

function neighbors(
  items: WikiListItem[],
  current: Pick<WikiCharacter, "realm" | "name">,
): { prev?: WikiNeighbor; next?: WikiNeighbor } {
  if (items.length < 2) return {};
  const sorted = [...items].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "es", { sensitivity: "base" }),
  );
  const idx = sorted.findIndex(
    (item) => item.name === current.name && item.realm === current.realm,
  );
  if (idx < 0) return {};
  return {
    prev: toNeighbor(sorted[(idx - 1 + sorted.length) % sorted.length]),
    next: toNeighbor(sorted[(idx + 1) % sorted.length]),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ realm: string; name: string }>;
}): Promise<Metadata> {
  const { realm, name } = await params;
  const char = await loadWikiChar(realm, name);
  if (!char) return { title: "Ficha no encontrada" };
  const description =
    (char.biography || char.personality || char.appearance || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 155) || `Ficha pública de ${char.display_name} en La Guardia de Elune.`;
  return {
    title: char.display_name,
    description,
    openGraph: {
      title: char.display_name,
      description,
      type: "profile",
      images: char.cover_url
        ? [{ url: char.cover_url, alt: char.display_name }]
        : undefined,
    },
  };
}

export default async function WikiCharacterPage({
  params,
}: {
  params: Promise<{ realm: string; name: string }>;
}) {
  const { realm, name } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const char = await loadWikiChar(realm, name);

  if (!char) {
    return (
      <main className="min-h-screen text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
          <Breadcrumb
            items={[
              { href: "/", label: "Inicio" },
              { href: "/personajes", label: "Personajes" },
            ]}
          />
          <p className="text-gray-400">Esta ficha aún no es pública.</p>
        </div>
      </main>
    );
  }

  const listRes = await fetch(apiUrl("/wiki/"), { cache: "no-store" });
  const items: WikiListItem[] = listRes.ok ? await listRes.json() : [];
  const { prev, next } = neighbors(items, char);

  return (
    <main className="relative text-white">
      <WikiCharacterView
        char={char}
        loggedIn={!!token}
        prev={prev}
        next={next}
      />
    </main>
  );
}
