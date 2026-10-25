import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/cover — cambia la portada de una historia publicada */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("cover");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ detail: "Falta la imagen" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("cover", file);
  const res = await fetch(apiUrl(`/stories/${id}/cover`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo cambiar la imagen" }));
  return Response.json(data, { status: res.status });
}
