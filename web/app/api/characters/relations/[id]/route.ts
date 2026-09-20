import { cookies } from "next/headers";

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
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/relations/${id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
