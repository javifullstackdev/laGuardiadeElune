import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";
import { authCookieOptions } from "@/lib/auth-cookie";
import { absoluteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(absoluteUrl("/?error=no-code", request));
  }

  const fastapiRes = await fetch(
    apiUrl(`/auth/discord/callback?code=${code}`),
  );

  if (!fastapiRes.ok) {
    return NextResponse.redirect(absoluteUrl("/?error=failed-to-fetch", request));
  }

  const data = await fastapiRes.json();
  const jwt = data.access_token;

  const userRes = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const user = userRes.ok ? await userRes.json() : null;
  const redirectTo = user?.has_blizzard ? "/profile" : "/onboarding";

  const response = NextResponse.redirect(absoluteUrl(redirectTo, request));
  response.cookies.set("token", jwt, authCookieOptions(60 * 60 * 24));

  return response;
}
