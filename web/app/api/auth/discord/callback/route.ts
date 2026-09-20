import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no-code", request.url));
  }

  const fastapiRes = await fetch(
    `http://localhost:8000/auth/discord/callback?code=${code}`
  );

  if (!fastapiRes.ok) {
    return NextResponse.redirect(new URL("/?error=failed-to-fetch", request.url));
  }

  const data = await fastapiRes.json();
  const jwt = data.access_token;

  // Comprobamos si el usuario ya tiene Battle.net vinculado
  // para decidir si enviarlo al onboarding o directamente al perfil
  const userRes = await fetch("http://localhost:8000/users/me", {
    headers: { Cookie: `token=${jwt}` },
  });
  const user = userRes.ok ? await userRes.json() : null;
  const redirectTo = user?.has_blizzard ? "/profile" : "/onboarding";

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set("token", jwt, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
