import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ImageRequestReview from "./ImageRequestReview";

import { apiUrl } from "@/lib/api";

export default async function AdminImageRequestsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending] = await Promise.all([
    fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(apiUrl("/image-requests/pending"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
  ]);

  if (!me || me.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold">Solicitudes de imagen</h1>
        <p className="text-sm text-gray-400 mb-8">
          Capturas in-game de los jugadores. Descárgalas, genera el retrato y publícalo aquí,
          o inclúyelo al publicar la ficha si te convence el texto.
        </p>
        <ImageRequestReview initial={pending} />
      </div>
    </main>
  );
}
