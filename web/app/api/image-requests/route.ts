import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/image-requests — crear solicitud con captura + formulario */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const formData = await req.formData();
  const upstream = new FormData();
  for (const key of ["name", "realm", "kind", "answers_json"]) {
    const v = formData.get(key);
    if (typeof v === "string") upstream.append(key, v);
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
