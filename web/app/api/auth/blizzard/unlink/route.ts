import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  await fetch("http://localhost:8000/auth/blizzard/unlink", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return NextResponse.redirect(new URL("/profile", request.url));
}
