import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(absoluteUrl("/", request));

  const { id } = await params;

  await fetch(apiUrl(`/posts/${id}`), {
    method: "DELETE",
    headers: { Cookie: `token=${token}` },
  });

  return NextResponse.redirect(absoluteUrl("/admin/posts", request));
}
