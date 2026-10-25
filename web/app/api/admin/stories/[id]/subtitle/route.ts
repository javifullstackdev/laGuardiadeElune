import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/subtitle — cambia el subtítulo de una historia publicada */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const subtitle = body && typeof body.subtitle === "string" ? body.subtitle : null;

  const res = await fetch(apiUrl(`/stories/${id}/subtitle`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subtitle }),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar el subtítulo" }));
  return Response.json(data, { status: res.status });
}
