import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";
import { authCookieOptions } from "@/lib/auth-cookie";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no-code", request.url));
  }

  const fastapiRes = await fetch(
    apiUrl(`/auth/discord/callback?code=${code}`),
  );

  if (!fastapiRes.ok) {
    return NextResponse.redirect(new URL("/?error=failed-to-fetch", request.url));
  }

  const data = await fastapiRes.json();
  const jwt = data.access_token;

  const userRes = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const user = userRes.ok ? await userRes.json() : null;
  const redirectTo = user?.has_blizzard ? "/profile" : "/onboarding";

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set("token", jwt, authCookieOptions(60 * 60 * 24));

  return response;
}
