import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  if (!me || (me.role !== "admin" && me.role !== "officer")) redirect("/admin");

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Panel admin
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-2xl font-bold">Solicitudes de imagen</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8">
          Captura de referencia + ajustes opcionales. Copia el JSON del prompt y usa la imagen
          adjunta para generar el arte con la línea estética de la hermandad.
        </p>
        <ImageRequestReview initial={pending} />
      </div>
    </main>
  );
}
