import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** DELETE /api/characters/remove?name=&realm=&game= — quita el personaje de la lista */
export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const realm = searchParams.get("realm");
  const game = searchParams.get("game");
  if (!name || !realm) return Response.json({ detail: "Faltan name/realm" }, { status: 400 });

  const query = game ? `?game=${encodeURIComponent(game)}` : "";
  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}${query}`),
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );

  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
