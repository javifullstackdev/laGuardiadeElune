import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; slot: string }> },
) {
  const { id, slot } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const res = await fetch(apiUrl(`/bios/${id}/sheet/${slot}/file`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "No se pudo descargar" }));
    return Response.json(data, { status: res.status });
  }

  const headers = new Headers();
  const disposition = res.headers.get("content-disposition");
  const type = res.headers.get("content-type");
  if (disposition) headers.set("content-disposition", disposition);
  if (type) headers.set("content-type", type);
  return new Response(await res.arrayBuffer(), { status: 200, headers });
}
