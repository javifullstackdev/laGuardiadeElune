import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl, publicApiUrl } from "@/lib/api";
import { buildShareMetadata } from "@/lib/seo";
import { SorteoDetail, type GuildDraw } from "../SorteosClient";

type Preview = {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
};

const robots = { index: false, follow: false };

async function loadPreview(id: string): Promise<Preview | "missing" | "error"> {
  const res = await fetch(apiUrl(`/draws/${id}/preview`), { cache: "no-store" }).catch(() => null);
  if (!res) return "error";
  if (res.status === 404 || res.status === 422) return "missing";
  if (!res.ok) return "error";
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const draw = await loadPreview(id);
  if (draw === "missing" || draw === "error") return { title: "Sorteo no encontrado", robots };
  const description =
    draw.summary?.replace(/\s+/g, " ").trim().slice(0, 160) || "Sorteo de la hermandad.";
  return {
    ...buildShareMetadata({
      title: draw.title,
      description,
      path: `/sorteos/${draw.id}`,
      image: draw.image_url,
    }),
    robots,
  };
}

function shell(title: string, children: ReactNode) {
  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-14">
        <Breadcrumb
          items={[{ href: "/", label: "Inicio" }, { href: "/sorteos", label: "Sorteos" }, { label: title }]}
        />
        {children}
      </div>
    </main>
  );
}

export default async function SorteoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await loadPreview(id);
  const token = (await cookies()).get("token")?.value;

  if (preview === "error") {
    return shell("Sorteo", (
      <>
        <h1 className="text-3xl font-quest-display font-bold">Sorteo</h1>
        <p className="mt-3 text-sm text-gray-400">
          No se ha podido cargar. Si acabas de actualizar el proyecto, aplica las migraciones.
        </p>
        <Link href="/sorteos" className="mt-6 inline-block text-sm text-yellow-400 hover:underline">
          Volver a sorteos
        </Link>
      </>
    ));
  }

  if (preview === "missing") {
    return shell("Sorteo", (
      <>
        <h1 className="text-3xl font-quest-display font-bold">Sorteo no encontrado</h1>
        <p className="mt-3 text-sm text-gray-400">Ese sorteo no existe o se ha borrado.</p>
        <Link href="/sorteos" className="mt-6 inline-block text-sm text-yellow-400 hover:underline">
          Volver a sorteos
        </Link>
      </>
    ));
  }

  if (!token) {
    return shell(preview.title, (
      <>
        <h1 className="text-3xl font-quest-display font-bold sm:text-4xl">{preview.title}</h1>
        <p className="mt-3 max-w-xl text-sm text-gray-400">
          Este sorteo es de la hermandad. Entra con Discord para verlo y apuntarte.
        </p>
        <a
          href={publicApiUrl("/auth/discord/login")}
          className="mt-6 inline-block rounded-lg bg-yellow-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
        >
          Entrar con Discord
        </a>
      </>
    ));
  }

  const headers = { Authorization: `Bearer ${token}` };
  const [drawRes, meRes] = await Promise.all([
    fetch(apiUrl(`/draws/${id}`), { headers, cache: "no-store" }),
    fetch(apiUrl("/users/me"), { headers, cache: "no-store" }),
  ]);

  if (drawRes.status === 401 || meRes.status === 401) {
    return shell(preview.title, (
      <>
        <h1 className="text-3xl font-quest-display font-bold sm:text-4xl">{preview.title}</h1>
        <p className="mt-3 text-sm text-gray-400">La sesión ha caducado. Entra otra vez para ver el sorteo.</p>
        <a
          href={publicApiUrl("/auth/discord/login")}
          className="mt-6 inline-block rounded-lg bg-yellow-500/90 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
        >
          Entrar con Discord
        </a>
      </>
    ));
  }

  if (!drawRes.ok) {
    return shell("Sorteo", (
      <>
        <h1 className="text-3xl font-quest-display font-bold">Sorteo no encontrado</h1>
        <Link href="/sorteos" className="mt-6 inline-block text-sm text-yellow-400 hover:underline">
          Volver a sorteos
        </Link>
      </>
    ));
  }

  const draw = (await drawRes.json()) as GuildDraw;
  const me = meRes.ok ? ((await meRes.json()) as { id: string; role: string }) : null;

  return shell(draw.title, (
    <SorteoDetail draw={draw} userId={me?.id ?? ""} isAdmin={me?.role === "admin"} />
  ));
}
