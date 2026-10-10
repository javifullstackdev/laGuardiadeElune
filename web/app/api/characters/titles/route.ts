import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
/**
 * GET /api/characters/titles?name=Deyk&realm=dun-modr
 * Devuelve los títulos ganados por un personaje del usuario autenticado.
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const name  = url.searchParams.get("name");
  const realm = url.searchParams.get("realm");

  if (!name || !realm) {
    return Response.json({ error: "Faltan name/realm" }, { status: 400 });
  }

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/titles`),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
