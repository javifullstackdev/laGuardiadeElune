import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { type, id } = await params;
  const res = await fetch(
    apiUrl(`/likes/admin/target/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
