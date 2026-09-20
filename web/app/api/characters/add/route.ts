import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Leer los datos del formulario HTML
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const realm = formData.get("realm") as string;
  const class_id = parseInt(formData.get("class_id") as string);
  const is_main = formData.get("is_main") === "true";

  const res = await fetch("http://localhost:8000/characters/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ name, realm, class_id, is_main }),
  });

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.redirect(
      new URL(`/personajes?error=${encodeURIComponent(error.detail)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/personajes", request.url));
}
