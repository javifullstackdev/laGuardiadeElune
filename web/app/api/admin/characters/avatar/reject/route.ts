import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";
/** POST /api/admin/characters/avatar/reject â€” rechaza avatar pendiente */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(absoluteUrl("/", request));

  const { name, realm } = await request.json();

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/avatar/reject`),
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
