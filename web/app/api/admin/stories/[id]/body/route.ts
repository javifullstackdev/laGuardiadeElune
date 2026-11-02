import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/body — cambia el texto de una historia publicada */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const biography = body && typeof body.biography === "string" ? body.biography : "";
  const personality = body && typeof body.personality === "string" ? body.personality : null;
  const appearance = body && typeof body.appearance === "string" ? body.appearance : null;
  if (!biography.trim()) {
    return Response.json({ detail: "La historia es demasiado corta" }, { status: 400 });
  }

  const res = await fetch(apiUrl(`/stories/${id}/body`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ biography, personality, appearance }),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar" }));
  return Response.json(data, { status: res.status });
}
