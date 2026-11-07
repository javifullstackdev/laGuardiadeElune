import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
/**
 * DELETE /api/characters/relations/[id]?name=X&realm=Y  → elimina relación
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name  = searchParams.get("name");
  const realm = searchParams.get("realm");
  const { id } = await params;
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/relations/${id}`),
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

/** PATCH /api/characters/relations/[id]?name=X&realm=Y → cambia tipo y nota */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const realm = searchParams.get("realm");
  const { id } = await params;
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const relation_type = body && typeof body.relation_type === "string" ? body.relation_type : "";
  const description = body && typeof body.description === "string" ? body.description : null;
  if (!relation_type) return Response.json({ detail: "Elige un tipo" }, { status: 400 });

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/relations/${id}`),
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ relation_type, description }),
    },
  );
  const data = await res.json().catch(() => ({ detail: "No se pudo guardar" }));
  return Response.json(data, { status: res.status });
}
