import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

const SLOTS = new Set(["front", "back", "face"]);

/** POST /api/characters/sheet-image — captura in-game de la ficha */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get("name");
  const realm = formData.get("realm");
  const slot = formData.get("slot");
  const file = formData.get("file");

  if (typeof name !== "string" || typeof realm !== "string" || typeof slot !== "string" || !(file instanceof File)) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (!SLOTS.has(slot)) {
    return Response.json({ error: "Esa imagen no forma parte de la ficha" }, { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file);

  const res = await fetch(
    apiUrl(
      `/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/sheet-image/${encodeURIComponent(slot)}`,
    ),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    },
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
