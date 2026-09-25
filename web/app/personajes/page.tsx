import PersonajesList from "./PersonajesList";
import type { WikiListItem } from "@/lib/wiki";

export default async function PersonajesPage() {
  const res = await fetch("http://localhost:8000/wiki/", { cache: "no-store" });
  const items: WikiListItem[] = res.ok ? await res.json() : [];

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold">Personajes</h1>
        <p className="text-gray-400 mt-2 text-sm max-w-2xl">
          Directorio A–Z de las fichas públicas. En la portada solo se muestran algunas;
          aquí están todas, ordenadas por nombre.
        </p>

        {items.length === 0 ? (
          <p className="text-gray-500 py-16 text-center">
            Aún no hay fichas publicadas.
          </p>
        ) : (
          <PersonajesList items={items} />
        )}
      </div>
    </main>
  );
}
