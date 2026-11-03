import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/heading — cambia el título, el subtítulo y el enlace */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body && typeof body.title === "string" ? body.title : "";
  const subtitle = body && typeof body.subtitle === "string" ? body.subtitle : null;
  const slug = body && typeof body.slug === "string" ? body.slug : "";
  if (!title.trim()) return Response.json({ detail: "El título no puede estar vacío" }, { status: 400 });

  const res = await fetch(apiUrl(`/stories/${id}/heading`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, subtitle, slug }),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar" }));
  return Response.json(data, { status: res.status });
}
