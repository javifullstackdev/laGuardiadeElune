import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { name, realm } = body;
  if (!name || !realm) {
    return Response.json({ detail: "Faltan nombre/realm" }, { status: 400 });
  }

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/bio/submit`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
