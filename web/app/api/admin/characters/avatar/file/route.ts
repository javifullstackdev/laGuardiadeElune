import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** GET /api/admin/characters/avatar/file — descarga un retrato pendiente */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const realm = searchParams.get("realm");
  const kind = searchParams.get("kind") === "face" ? "face" : "full";
  if (!name || !realm) return Response.json({ detail: "Faltan datos" }, { status: 400 });

  const res = await fetch(
    apiUrl(
      `/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/pending-file?kind=${kind}`,
    ),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
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
