import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** GET /api/admin/points/history — historial de asignaciones */
export async function GET(req: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const res = await fetch(apiUrl(`/points/admin/history${qs ? `?${qs}` : ""}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
