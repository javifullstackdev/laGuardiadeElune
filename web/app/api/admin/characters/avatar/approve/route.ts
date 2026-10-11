import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";

/** POST /api/admin/characters/avatar/approve — aprueba imagen completa o cara */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(absoluteUrl("/", request));

  const { name, realm, kind = "full" } = await request.json();
  const path = kind === "face" ? "face/approve" : "avatar/approve";

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/${path}`),
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
