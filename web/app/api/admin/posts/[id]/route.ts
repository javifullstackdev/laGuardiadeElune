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

  await fetch(apiUrl(`/posts/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `token=${token}`,
    },
    body: JSON.stringify(body),
  });

  return NextResponse.redirect(absoluteUrl("/admin/posts", request));
}
