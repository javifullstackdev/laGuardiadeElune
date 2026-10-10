import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  // El usuario canceló el login de Blizzard
  if (!code) {
    return NextResponse.redirect(
      absoluteUrl("/profile?error=bnet_cancelled", request),
    );
  }

  // Leer el JWT cookie del usuario (ya logueado con Discord)
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(absoluteUrl("/", request));
  }

  // Enviar el código a FastAPI — que lo intercambia por el token de Blizzard
  // Pasamos el JWT en el header Authorization para que FastAPI sepa quién es el usuario
  const res = await fetch(apiUrl("/auth/blizzard/link"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Error vinculando Battle.net:", error);
    return NextResponse.redirect(
      absoluteUrl("/profile?error=bnet_failed", request),
    );
  }

  // Battle.net vinculado → ir al onboarding paso 3
  return NextResponse.redirect(absoluteUrl("/onboarding", request));
}
