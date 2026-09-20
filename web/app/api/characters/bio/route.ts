import { cookies } from "next/headers";

/** PATCH /api/characters/bio — actualiza datos de lore de un personaje */
export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { name, realm, biography, personality, appearance } = body;

  if (!name || !realm) {
    return Response.json({ error: "Faltan nombre/realm" }, { status: 400 });
  }

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/bio`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ biography, personality, appearance }),
    }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
