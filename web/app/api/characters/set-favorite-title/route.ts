import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { name, realm, title_id } = body;

  if (!name || !realm) {
    return Response.json({ error: "Faltan datos del personaje" }, { status: 400 });
  }

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/favorite-title`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title_id: title_id ?? null }),
    }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
