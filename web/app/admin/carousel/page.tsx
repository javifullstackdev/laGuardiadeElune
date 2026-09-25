import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import CarouselAdmin from "./CarouselAdmin";
import type { StoryPublic } from "@/lib/stories";
import type { WikiListItem } from "@/lib/wiki";

export default async function AdminCarouselPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };
  const [userRes, slidesRes, storiesRes, wikiRes] = await Promise.all([
    fetch("http://localhost:8000/users/me", { headers, cache: "no-store" }),
    fetch("http://localhost:8000/hero/admin", { headers, cache: "no-store" }),
    fetch("http://localhost:8000/stories/", { cache: "no-store" }),
    fetch("http://localhost:8000/wiki/", { cache: "no-store" }),
  ]);
  if (!userRes.ok) redirect("/");
  const user = await userRes.json();
  if (user.role !== "admin" && user.role !== "officer") redirect("/");

  const slides = slidesRes.ok ? await slidesRes.json() : [];
  const stories: StoryPublic[] = storiesRes.ok ? await storiesRes.json() : [];
  const characters: WikiListItem[] = wikiRes.ok ? await wikiRes.json() : [];

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Carrusel de portada</h1>
            <p className="text-gray-400 text-sm mt-1">
              El Eremita elige qué historias o fichas se destacan en la home.
            </p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-300">
            Panel admin
          </Link>
        </div>
        <CarouselAdmin initialSlides={slides} stories={stories} characters={characters} />
      </div>
    </main>
  );
}
