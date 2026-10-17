import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/characters/sync-titles — importa los títulos que el personaje ya tiene en el juego */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { name, realm } = await req.json();
  if (!name || !realm) {
    return Response.json({ error: "Faltan datos del personaje" }, { status: 400 });
  }

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/sync-titles`),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => ({ detail: "Respuesta inválida del servidor" }));
  return Response.json(data, { status: res.status });
}
