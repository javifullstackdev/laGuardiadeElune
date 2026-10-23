import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/image-requests/:id/publish — el admin sube el arte y se publica */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ detail: "Falta la imagen" }, { status: 400 });
  }
  const upstream = new FormData();
  upstream.append("file", file);

  const res = await fetch(apiUrl(`/image-requests/${id}/publish`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
