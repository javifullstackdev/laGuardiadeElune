import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const upstream = new FormData();
    for (const key of ["biography", "personality", "appearance"]) {
      const value = form.get(key);
      if (typeof value === "string") upstream.append(key, value);
    }
    for (const key of ["full_file", "face_file"]) {
      const file = form.get(key);
      if (file instanceof File && file.size > 0) upstream.append(key, file);
    }
    const res = await fetch(apiUrl(`/bios/${id}/publish`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  }

  const body = await req.json();
  const action = body.action === "reject" ? "reject" : "publish";
  const res = await fetch(apiUrl(`/bios/${id}/${action}`), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: body.reason ?? null,
      biography: body.biography ?? "",
      personality: body.personality ?? null,
      appearance: body.appearance ?? null,
    }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
