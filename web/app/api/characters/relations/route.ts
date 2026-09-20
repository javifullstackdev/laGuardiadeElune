import { cookies } from "next/headers";

/**
 * GET  /api/characters/relations?name=X&realm=Y → lista relaciones
 * POST /api/characters/relations               → añade relación
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name  = searchParams.get("name");
  const realm = searchParams.get("realm");
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/relations`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { name, realm, to_name, to_realm, relation_type, description } = body;
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/relations`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to_name, to_realm, relation_type, description }),
    }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
