import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import GoalCard from "@/app/banco/GoalCard";
import Breadcrumb from "@/app/components/Breadcrumb";
import { apiUrl, publicApiUrl } from "@/lib/api";
import { goalDescription } from "@/lib/gold";
import { buildShareMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Announcement = {
  title: string;
  headline: string;
  goal_copper: number;
  confirmed_copper: number;
  pending_copper: number;
};

async function loadAnnouncement(): Promise<Announcement | null> {
  try {
    const res = await fetch(apiUrl("/bank/gold/announcement"), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Announcement;
    if (typeof data.goal_copper !== "number" || typeof data.confirmed_copper !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const goal = await loadAnnouncement();
  const headline = goal?.headline ?? "¡Un banco para todos!";
  const version = goal ? `${goal.confirmed_copper}-${goal.goal_copper}` : "0";
  return {
    ...buildShareMetadata({
      title: headline,
      description: goal
        ? goalDescription(goal.confirmed_copper, goal.goal_copper)
        : "La misión de oro de La Guardia de Elune.",
      path: "/objetivo",
      image: `/objetivo/tarjeta/${version}.jpg`,
      imageType: "image/jpeg",
      imageWidth: 1200,
      imageHeight: 630,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function ObjetivoPage() {
  const goal = await loadAnnouncement();
  const token = (await cookies()).get("token")?.value;
  const actionClass =
    "inline-flex items-center justify-center rounded-lg bg-yellow-500/90 px-4 py-2.5 text-sm font-medium text-black hover:bg-yellow-400";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumb items={[{ href: "/", label: "Inicio" }, { label: "Misión" }]} />
        {goal ? (
          <GoalCard
            gold={goal}
            heading="h1"
            action={
              token ? (
                <Link href="/banco" className={actionClass}>
                  Enviar oro
                </Link>
              ) : (
                <a href={publicApiUrl("/auth/discord/login")} className={actionClass}>
                  Entrar con Discord para colaborar
                </a>
              )
            }
          />
        ) : (
          <>
            <h1 className="font-quest-display text-3xl font-bold">¡Un banco para todos!</h1>
            <p className="mt-4 text-sm text-gray-400">La misión no está disponible ahora.</p>
          </>
        )}
      </div>
    </main>
  );
}
