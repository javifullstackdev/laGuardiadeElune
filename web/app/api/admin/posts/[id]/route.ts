import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const { id } = await params;
  const formData = await request.formData();

  const body: Record<string, string> = {};
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;

  if (title) body.title = title;
  if (content) body.content = content;
  if (category) body.category = category;
  const subtitle = formData.get("subtitle");
  const cover_url = formData.get("cover_url");
  if (subtitle !== null) body.subtitle = (subtitle as string).trim();
  if (cover_url !== null) body.cover_url = (cover_url as string).trim();

  await fetch(`http://localhost:8000/posts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
    },
    body: JSON.stringify(body),
  });

  return NextResponse.redirect(new URL("/admin/posts", request.url));
}