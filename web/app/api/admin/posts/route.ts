import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string | null;
  const subtitle = (formData.get("subtitle") as string | null)?.trim() || null;
  const cover_url = (formData.get("cover_url") as string | null)?.trim() || null;

  await fetch("http://localhost:8000/posts/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
    },
    body: JSON.stringify({ title, content, category, subtitle, cover_url }),
  });

  return NextResponse.redirect(new URL("/admin/posts", request.url));
}