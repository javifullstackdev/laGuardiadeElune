import { cookies } from "next/headers";
import Breadcrumb from "@/app/components/Breadcrumb";
import type { WikiCharacter } from "@/lib/wiki";
import WikiCharacterView from "@/app/personajes/WikiCharacterView";

export default async function WikiCharacterPage({
  params,
}: {
  params: Promise<{ realm: string; name: string }>;
}) {
  const { realm, name } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const res = await fetch(
    `http://localhost:8000/wiki/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
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

  const char: WikiCharacter = await res.json();

  return (
    <main className="relative text-white">
      <WikiCharacterView char={char} loggedIn={!!token} />
    </main>
  );
}
