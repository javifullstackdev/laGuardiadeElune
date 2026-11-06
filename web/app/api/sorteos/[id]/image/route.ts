import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

async function forward(req: Request, id: string, method: "POST" | "DELETE") {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  let body: FormData | undefined;
  if (method === "POST") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ detail: "Falta la imagen" }, { status: 400 });
    }
    body = new FormData();
    body.append("file", file);
  }

  const res = await fetch(apiUrl(`/draws/${id}/image`), {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(req, id, "POST");
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(_req, id, "DELETE");
}
