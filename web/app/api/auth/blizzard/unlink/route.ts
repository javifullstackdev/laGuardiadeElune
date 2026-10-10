import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.redirect(absoluteUrl("/", request));

  await fetch(apiUrl("/auth/blizzard/unlink"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return NextResponse.redirect(absoluteUrl("/profile", request));
}
