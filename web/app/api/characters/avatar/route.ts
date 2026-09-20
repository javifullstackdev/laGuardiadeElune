import { cookies } from "next/headers";

/** POST /api/characters/avatar — sube una imagen para el avatar de un personaje */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const name  = formData.get("name")  as string;
  const realm = formData.get("realm") as string;
  const file  = formData.get("file")  as File | null;

  if (!name || !realm || !file) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Reenviar el archivo a la API de FastAPI
  const upstream = new FormData();
  upstream.append("file", file);

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/avatar`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

/** DELETE /api/characters/avatar?name=X&realm=Y — cancela imagen pendiente o custom */
export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name  = searchParams.get("name");
  const realm = searchParams.get("realm");
  if (!name || !realm) return Response.json({ error: "Faltan name/realm" }, { status: 400 });

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/avatar`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
