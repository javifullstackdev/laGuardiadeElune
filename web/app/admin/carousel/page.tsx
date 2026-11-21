import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CarouselAdmin from "./CarouselAdmin";
import type { StoryPublic } from "@/lib/stories";
import type { WikiListItem } from "@/lib/wiki";

import { apiUrl } from "@/lib/api";
export default async function AdminCarouselPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };
  const [userRes, slidesRes, storiesRes, wikiRes] = await Promise.all([
    fetch(apiUrl("/users/me"), { headers, cache: "no-store" }),
    fetch(apiUrl("/hero/admin"), { headers, cache: "no-store" }),
    fetch(apiUrl("/stories/"), { cache: "no-store" }),
    fetch(apiUrl("/wiki/"), { cache: "no-store" }),
  ]);
  if (!userRes.ok) redirect("/");
  const user = await userRes.json();
  if (user.role !== "admin") redirect("/");

  const slides = slidesRes.ok ? await slidesRes.json() : [];
  const stories: StoryPublic[] = storiesRes.ok ? await storiesRes.json() : [];
  const characters: WikiListItem[] = wikiRes.ok ? await wikiRes.json() : [];

  return (
    <main className="min-h-screen">
      <div className="w-full max-w-6xl px-4 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Carrusel de portada</h1>
          <p className="text-gray-400 text-sm mt-1">
            El Eremita elige qué historias o fichas se destacan en la home.
          </p>
        </div>
        <CarouselAdmin initialSlides={slides} stories={stories} characters={characters} />
      </div>
    </main>
  );
}
