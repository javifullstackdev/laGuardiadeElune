import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
/** POST /api/characters/sync-blizzard-ids — sincroniza IDs de Blizzard para render */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const res = await fetch(apiUrl("/characters/sync-blizzard-ids"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
