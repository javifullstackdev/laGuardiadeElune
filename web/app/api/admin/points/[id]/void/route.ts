import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/points/:id/void — anula la asignación (motivo obligatorio) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(apiUrl(`/points/admin/${encodeURIComponent(id)}/void`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
