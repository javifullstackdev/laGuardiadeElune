import { NextRequest, NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";
/** POST /api/admin/titles â€” crea un nuevo tÃ­tulo */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.redirect(absoluteUrl("/", request));

  const formData = await request.formData();
  const name        = formData.get("name") as string;
  const source      = formData.get("source") as string;
  const slot        = (formData.get("slot") as string) || "title";
  const description = (formData.get("description") as string) || null;

  const res = await fetch(apiUrl("/titles/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, source, slot, description }),
  });

  const redirect = absoluteUrl("/admin/titles", request);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    redirect.searchParams.set("error", err.detail ?? "Error al crear el tÃ­tulo");
  }

  return NextResponse.redirect(redirect);
}
