import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BioReviewPanel from "./BioReviewPanel";
import PublishedSheetEditor from "./PublishedSheetEditor";
import SurnameReview, { type SurnameItem } from "./SurnameReview";
import type { BioPending, BioPublished } from "@/lib/bio";

import { apiUrl } from "@/lib/api";
export default async function AdminBiosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const [me, pending, published, surnames] = await Promise.all([
    fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(apiUrl("/bios/pending"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(apiUrl("/bios/published"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
    fetch(apiUrl("/bios/surnames"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : [])),
  ]);

  if (!me || me.role !== "admin") redirect("/");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </a>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Fichas</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          El jugador responde el cuestionario y puede adjuntar capturas del juego.
          Si te convence la ficha, escribe el texto, sube el arte y se publica.
          Las que ya están en público se corrigen más abajo. Los apellidos se aceptan u ocultan aquí.
        </p>
        <section className="mb-14">
          <h2 className="text-lg font-semibold mb-1">Apellidos</h2>
          <p className="text-sm text-gray-500 mb-5">
            Si un apellido no es válido, deja de mostrarse en la ficha, las historias y el carrusel.
          </p>
          <SurnameReview initial={surnames as SurnameItem[]} />
        </section>
        <section className="mb-14">
          <h2 className="text-lg font-semibold mb-4">Pendientes</h2>
          <BioReviewPanel pending={pending as BioPending[]} />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-1">Publicadas</h2>
          <p className="text-sm text-gray-500 mb-5">
            Cambia la biografía, la personalidad, el aspecto o sustituye la imagen.
            Al guardar, la ficha pública se actualiza.
          </p>
          <PublishedSheetEditor initial={published as BioPublished[]} />
        </section>
      </div>
    </main>
  );
}
