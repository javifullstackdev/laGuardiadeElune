import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/bios/:id/surname — marca el apellido como válido u oculto */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(apiUrl(`/bios/${id}/surname`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ allowed: Boolean(body.allowed) }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
