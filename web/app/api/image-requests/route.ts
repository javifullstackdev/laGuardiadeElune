import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** GET /api/image-requests — capturas que el jugador ya ha enviado */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const res = await fetch(apiUrl("/image-requests/mine"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

/** POST /api/image-requests — adjuntar capturas in-game */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const upstream = new FormData();
  for (const key of ["name", "realm", "kind"]) {
    const v = formData.get(key);
    if (typeof v === "string") upstream.append(key, v);
  }
  for (const file of formData.getAll("files")) {
    if (file instanceof File) upstream.append("files", file);
  }
  const file = formData.get("file");
  if (file instanceof File) upstream.append("file", file);

  const res = await fetch(apiUrl("/image-requests"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
