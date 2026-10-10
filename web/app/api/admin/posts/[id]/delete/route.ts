import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const { id } = await params;

  await fetch(apiUrl(`/posts/${id}`), {
    method: "DELETE",
    headers: { Cookie: `token=${token}` },
  });

  return NextResponse.redirect(new URL("/admin/posts", request.url));
}