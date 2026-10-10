import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name  = searchParams.get("name");
  const realm = searchParams.get("realm");
  if (!name || !realm)
    return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const res = await fetch(
    apiUrl(`/characters/${encodeURIComponent(name)}/${encodeURIComponent(realm)}/professions`),
    { headers: { Cookie: `token=${token}` }, cache: "no-store" },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
