import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

const SECTIONS = [
  {
    href:        "/admin/players",
    title:       "Jugadores",
    description: "Ver todos los miembros, sus puntos, roles, cumpleaños y personajes.",
    color:       "border-blue-500/40 hover:border-blue-400",
    badge:       "bg-blue-500/20 text-blue-300",
  },
  {
    href:        "/admin/avatars",
    title:       "Imágenes pendientes",
    description: "Revisar y aprobar las imágenes de personaje enviadas por los jugadores.",
    color:       "border-green-500/40 hover:border-green-400",
    badge:       "bg-green-500/20 text-green-300",
  },
  {
    href:        "/admin/titles",
    title:       "Títulos",
    description: "Crear títulos y asignarlos a los personajes de los miembros.",
    color:       "border-yellow-500/40 hover:border-yellow-400",
    badge:       "bg-yellow-500/20 text-yellow-300",
  },
  {
    href:        "/admin/posts",
    title:       "Posts",
    description: "Crear, editar y eliminar las publicaciones del tablón.",
    color:       "border-purple-500/40 hover:border-purple-400",
    badge:       "bg-purple-500/20 text-purple-300",
  },
  {
    href:        "/admin/bios",
    title:       "Fichas",
    description: "Leer el cuestionario del jugador y escribir la biografía de la ficha.",
    color:       "border-amber-500/40 hover:border-amber-400",
    badge:       "bg-amber-500/20 text-amber-300",
  },
  {
    href:        "/admin/stories",
    title:       "Historias",
    description: "Revisar relatos de los jugadores y eliminar los publicados.",
    color:       "border-fuchsia-500/40 hover:border-fuchsia-400",
    badge:       "bg-fuchsia-500/20 text-fuchsia-300",
  },
  {
    href:        "/admin/carousel",
    title:       "Carrusel",
    description: "Elegir las historias y fichas que se destacan en la portada.",
    color:       "border-cyan-500/40 hover:border-cyan-400",
    badge:       "bg-cyan-500/20 text-cyan-300",
  },
];

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const res = await fetch("http://localhost:8000/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/");
  const user = await res.json();
  if (user.role !== "admin" && user.role !== "officer") redirect("/");

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold">Panel de administración</h1>
          <p className="text-gray-400 mt-2">
            Conectado como <span className="text-yellow-400">{user.username}</span>
            {" "}·{" "}
            <span className="capitalize text-gray-300">{user.role}</span>
          </p>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group block rounded-xl border-2 bg-gray-900 p-6 transition-colors ${s.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold group-hover:text-white transition-colors">
                  {s.title}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.title}
                </span>
              </div>
              <p className="text-sm text-gray-400">{s.description}</p>
              <p className="text-xs text-gray-600 mt-3">Ir a {s.title} →</p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
