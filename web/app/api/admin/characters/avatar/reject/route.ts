import { NextRequest, NextResponse } from "next/server";

/** POST /api/admin/characters/avatar/reject — rechaza avatar pendiente */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const { name, realm } = await request.json();

  const res = await fetch(
    `http://localhost:8000/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/avatar/reject`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
