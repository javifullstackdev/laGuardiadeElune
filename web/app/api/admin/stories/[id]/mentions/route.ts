import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** POST /api/admin/stories/:id/mentions — etiqueta un personaje que aparece */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const to_name = body && typeof body.to_name === "string" ? body.to_name : "";
  const to_realm = body && typeof body.to_realm === "string" ? body.to_realm : "";
  if (!to_name.trim() || !to_realm.trim()) {
    return Response.json({ detail: "Elige un personaje" }, { status: 400 });
  }

  const res = await fetch(apiUrl(`/stories/${id}/mentions`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to_name, to_realm }),
  });
  const data = await res.json().catch(() => ({ detail: "No se pudo etiquetar" }));
  return Response.json(data, { status: res.status });
}

/** DELETE /api/admin/stories/:id/mentions?name=&realm= — quita una etiqueta de aparición */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const realm = searchParams.get("realm") ?? "";
  const res = await fetch(
    apiUrl(`/stories/${id}/mentions?name=${encodeURIComponent(name)}&realm=${encodeURIComponent(realm)}`),
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json().catch(() => ({ detail: "No se pudo quitar" }));
  return Response.json(data, { status: res.status });
}
