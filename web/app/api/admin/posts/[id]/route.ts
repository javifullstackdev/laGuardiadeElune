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