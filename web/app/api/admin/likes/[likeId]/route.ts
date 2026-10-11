import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ likeId: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { likeId } = await params;
  const res = await fetch(apiUrl(`/likes/admin/${encodeURIComponent(likeId)}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
