import Link from "next/link";
import StoryTile from "../components/StoryTile";
import type { StoryPublic } from "@/lib/stories";

export default async function LorePage() {
  const res = await fetch("http://localhost:8000/stories/", { cache: "no-store" });
  const stories: StoryPublic[] = res.ok ? await res.json() : [];

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold">Historias</h1>
        <p className="text-gray-400 mt-2 text-sm">
          Relatos escritos por los jugadores y revisados por el Eremita. Las fichas están en{" "}
          <Link href="/personajes" className="text-yellow-400 hover:underline">Personajes</Link>.
        </p>

        {stories.length === 0 ? (
          <p className="text-gray-500 py-16 text-center">
            Aún no hay historias publicadas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {stories.map((story) => (
              <li key={story.id}>
                <StoryTile story={story} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
