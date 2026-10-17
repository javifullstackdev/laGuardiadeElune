import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";

/** GET /api/admin/titles/blizzard-index/:id — detalle de un título de Blizzard */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "No has iniciado sesión" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ detail: "ID de título inválido" }, { status: 400 });
  }

  const res = await fetch(apiUrl(`/titles/blizzard-index/${id}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({ detail: "Respuesta inválida del servidor" }));
  return NextResponse.json(body, { status: res.status });
}
