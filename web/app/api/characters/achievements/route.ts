import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const realm = searchParams.get("realm");
  if (!name || !realm) {
    return Response.json({ detail: "Faltan nombre/realm" }, { status: 400 });
  }

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/achievements`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
