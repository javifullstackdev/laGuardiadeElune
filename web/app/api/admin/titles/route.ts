import { NextRequest, NextResponse } from "next/server";

/** POST /api/admin/titles — crea un nuevo título */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  const formData = await request.formData();
  const name        = formData.get("name") as string;
  const source      = formData.get("source") as string;
  const description = (formData.get("description") as string) || null;

  const res = await fetch("http://localhost:8000/titles/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, source, description }),
  });

  const redirect = new URL("/admin/titles", request.url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    redirect.searchParams.set("error", err.detail ?? "Error al crear el título");
  }

  return NextResponse.redirect(redirect);
}
