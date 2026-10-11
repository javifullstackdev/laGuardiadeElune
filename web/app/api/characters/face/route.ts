import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/characters/face — sube foto de cara (ranking) */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get("name") as string;
  const realm = formData.get("realm") as string;
  const file = formData.get("file") as File | null;

  if (!name || !realm || !file) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file);

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/face`),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

/** DELETE /api/characters/face?name=X&realm=Y */
export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const realm = searchParams.get("realm");
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/face`),
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
