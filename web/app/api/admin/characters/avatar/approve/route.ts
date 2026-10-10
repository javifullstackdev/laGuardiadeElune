import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
/** POST /api/admin/characters/avatar/approve — aprueba avatar pendiente */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const { name, realm } = await request.json();

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/avatar/approve`),
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
