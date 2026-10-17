import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";

/** GET /api/admin/titles/blizzard-index?q= — busca en el índice de títulos de Blizzard */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "No has iniciado sesión" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const res = await fetch(apiUrl(`/titles/blizzard-index?q=${encodeURIComponent(q)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({ detail: "Respuesta inválida del servidor" }));
  return NextResponse.json(body, { status: res.status });
}
