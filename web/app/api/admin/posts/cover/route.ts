import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Falta el archivo" }, { status: 400 });
  }

  const body = new FormData();
  body.append("file", file);
  const res = await fetch(apiUrl("/posts/cover"), {
    method: "POST",
    headers: { Cookie: `token=${token}` },
    body,
  });
  const data = await res.json().catch(() => ({ detail: "Respuesta no válida del servidor" }));
  return NextResponse.json(data, { status: res.status });
}
