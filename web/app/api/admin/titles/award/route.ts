import { NextRequest, NextResponse } from "next/server";

/** POST /api/admin/titles/award — otorga un título a un personaje */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const formData       = await request.formData();
  const title_id       = formData.get("title_id") as string;
  const character_name = formData.get("character_name") as string;
  const character_realm = formData.get("character_realm") as string;

  const res = await fetch(`http://localhost:8000/titles/${title_id}/award`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ character_name, character_realm }),
  });

  const redirect = new URL("/admin/titles", request.url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    redirect.searchParams.set("error", err.detail ?? "Error al otorgar el título");
  }

  return NextResponse.redirect(redirect);
}
