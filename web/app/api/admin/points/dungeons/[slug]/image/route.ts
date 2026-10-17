import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/points/dungeons/:slug/image — portada propia de la mazmorra */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { slug } = await params;
  const body = await req.formData();
  const res = await fetch(apiUrl(`/points/admin/dungeons/${encodeURIComponent(slug)}/image`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
