import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const res = await fetch(apiUrl(`/likes/admin/ranking${qs ? `?${qs}` : ""}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
