import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/points/sync-mythic-plus — fuerza una pasada de Raider.io */
export const maxDuration = 180;

export async function POST() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const res = await fetch(apiUrl("/points/sync-mythic-plus"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const text = await res.text();
  try {
    return Response.json(JSON.parse(text), { status: res.status });
  } catch {
    return Response.json(
      { detail: text || "La API no respondió" },
      { status: res.status || 502 },
    );
  }
}
