import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/heading — título, subtítulo, enlace y corte de la tarjeta */
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
  const cardLineOne = body && typeof body.card_line_one === "string" ? body.card_line_one : "";
  const cardLineTwo = body && typeof body.card_line_two === "string" ? body.card_line_two : "";
  if (!title.trim()) return Response.json({ detail: "El título no puede estar vacío" }, { status: 400 });

  const res = await fetch(apiUrl(`/stories/${id}/heading`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      subtitle,
      slug,
      card_line_one: cardLineOne,
      card_line_two: cardLineTwo,
    }),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar" }));
  return Response.json(data, { status: res.status });
}
