import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const res = await fetch(apiUrl(`/recruitment/admin/${id}/read`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({ detail: "No se ha podido guardar" }));
  return Response.json(data, { status: res.status });
}
