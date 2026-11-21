import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Coins,
  GalleryHorizontal,
  Hammer,
  Heart,
  Image,
  ImagePlus,
  Newspaper,
  ScrollText,
  Swords,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";

import { apiUrl } from "@/lib/api";

const SECTIONS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  badge: string;
  adminOnly?: boolean;
}[] = [
  {
    href:        "/admin/players",
    title:       "Jugadores",
    description: "Ver todos los miembros, sus puntos, roles, cumpleaños y personajes.",
    icon:        Users,
    color:       "border-blue-500/40 hover:border-blue-400",
    badge:       "bg-blue-500/20 text-blue-300",
  },
  {
    href:        "/admin/avatars",
    title:       "Imágenes pendientes",
    description: "Descargar los retratos que un jugador subió directamente, y aprobarlos o rechazarlos.",
    icon:        Image,
    color:       "border-green-500/40 hover:border-green-400",
    badge:       "bg-green-500/20 text-green-300",
  },
  {
    href:        "/admin/image-requests",
    title:       "Solicitudes de imagen",
    description: "Descargar capturas in-game y publicar el retrato que generes tú.",
    icon:        ImagePlus,
    color:       "border-orange-500/40 hover:border-orange-400",
    badge:       "bg-orange-500/20 text-orange-300",
  },
  {
    href:        "/admin/reclutamiento",
    title:       "Reclutamiento",
    description: "Leer las solicitudes de quien quiere entrar en la hermandad.",
    icon:        UserPlus,
    color:       "border-sky-500/40 hover:border-sky-400",
    badge:       "bg-sky-500/20 text-sky-300",
  },
  {
    href:        "/admin/titles",
    title:       "Títulos",
    description: "Crear títulos y asignarlos a los personajes de los miembros.",
    icon:        Award,
    color:       "border-yellow-500/40 hover:border-yellow-400",
    badge:       "bg-yellow-500/20 text-yellow-300",
  },
  {
    href:        "/admin/posts",
    title:       "Posts",
    description: "Crear, editar y eliminar las publicaciones del tablón.",
    icon:        Newspaper,
    color:       "border-purple-500/40 hover:border-purple-400",
    badge:       "bg-purple-500/20 text-purple-300",
  },
  {
    href:        "/admin/bios",
    title:       "Fichas",
    description: "Publicar fichas, corregir las ya públicas y, en cada personaje de Retail, mostrar u ocultar el apellido.",
    icon:        ScrollText,
    color:       "border-amber-500/40 hover:border-amber-400",
    badge:       "bg-amber-500/20 text-amber-300",
  },
  {
    href:        "/admin/stories",
    title:       "Historias",
    description: "Revisar relatos de los jugadores y eliminar los publicados.",
    icon:        BookOpen,
    color:       "border-fuchsia-500/40 hover:border-fuchsia-400",
    badge:       "bg-fuchsia-500/20 text-fuchsia-300",
  },
  {
    href:        "/admin/carousel",
    title:       "Carrusel",
    description: "Elegir las historias y fichas que se destacan en la portada.",
    icon:        GalleryHorizontal,
    color:       "border-cyan-500/40 hover:border-cyan-400",
    badge:       "bg-cyan-500/20 text-cyan-300",
  },
  {
    href:        "/admin/likes",
    title:       "Likes",
    description: "Ranking de posts, historias y fichas; quién ha dado like y señales anti-trampas.",
    icon:        Heart,
    color:       "border-rose-500/40 hover:border-rose-400",
    badge:       "bg-rose-500/20 text-rose-300",
  },
  {
    href:        "/admin/points",
    title:       "Puntos",
    description: "Forzar ahora la revisión de míticas+ (Raider.io) en lugar de esperar al job de 6 h.",
    icon:        Swords,
    color:       "border-emerald-500/40 hover:border-emerald-400",
    badge:       "bg-emerald-500/20 text-emerald-300",
  },
  {
    href:        "/admin/banco",
    title:       "Banco",
    description: "Validar ingresos, marcar retiradas y ajustar los puntos de cada objeto.",
    icon:        Coins,
    color:       "border-lime-500/40 hover:border-lime-400",
    badge:       "bg-lime-500/20 text-lime-300",
    adminOnly:   true,
  },
  {
    href:        "/admin/pedidos",
    title:       "Pedidos",
    description: "Fijar los puntos que gana el artesano por cada pedido recogido. Por defecto, 50.",
    icon:        Hammer,
    color:       "border-teal-500/40 hover:border-teal-400",
    badge:       "bg-teal-500/20 text-teal-300",
    adminOnly:   true,
  },
  {
    href:        "/sorteos",
    title:       "Sorteos",
    description: "Abrir, modificar o borrar una peña, adjuntar la imagen y marcar los Bizum.",
    icon:        Ticket,
    color:       "border-amber-500/40 hover:border-amber-400",
    badge:       "bg-amber-500/20 text-amber-300",
    adminOnly:   true,
  },
];

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const res = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/");
  const user = await res.json();
  if (user.role !== "admin") redirect("/");

  const sections = SECTIONS.filter((s) => !("adminOnly" in s && s.adminOnly) || user.role === "admin");

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold">Panel de administración</h1>
          <p className="text-gray-400 mt-2">
            Conectado como <span className="text-yellow-400">{user.username}</span>
            {" "}·{" "}
            <span className="capitalize text-gray-300">{user.role}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`group flex h-full flex-col rounded-xl border-2 bg-gray-900 p-5 transition-colors ${s.color}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.badge}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold transition-colors group-hover:text-white">
                    {s.title}
                  </h2>
                </div>
                <p className="flex-1 text-sm text-gray-400">{s.description}</p>
                <p className="mt-4 text-xs text-gray-600">Ir a {s.title} →</p>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}
