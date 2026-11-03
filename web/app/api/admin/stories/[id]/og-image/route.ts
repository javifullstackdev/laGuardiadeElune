import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST/DELETE /api/admin/stories/:id/og-image — imagen al compartir en WhatsApp y X */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ detail: "Falta la imagen" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("image", file);
  const res = await fetch(apiUrl(`/stories/${id}/og-image`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar la imagen" }));
  return Response.json(data, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const res = await fetch(apiUrl(`/stories/${id}/og-image`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json().catch(() => ({ detail: "No se pudo quitar la imagen" }));
  return Response.json(data, { status: res.status });
}
