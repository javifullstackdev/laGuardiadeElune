import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";
import { authCookieOptions } from "@/lib/auth-cookie";
import { clearOauthCookie, DISCORD_OAUTH_COOKIE, oauthStateMatches } from "@/lib/oauth-state";
import { absoluteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const saved = request.cookies.get(DISCORD_OAUTH_COOKIE)?.value;

  if (!code || !saved || !oauthStateMatches(saved, state)) {
    const response = NextResponse.redirect(
      absoluteUrl(`/?error=${code ? "oauth-state" : "no-code"}`, request),
    );
    clearOauthCookie(response, DISCORD_OAUTH_COOKIE);
    return response;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).at(-1) || "";

  const fastapiRes = await fetch(
    apiUrl(
      `/auth/discord/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    ),
    {
      headers: {
        Cookie: `${DISCORD_OAUTH_COOKIE}=${saved}`,
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
      cache: "no-store",
    },
  );

  if (!fastapiRes.ok) {
    const response = NextResponse.redirect(absoluteUrl("/?error=failed-to-fetch", request));
    clearOauthCookie(response, DISCORD_OAUTH_COOKIE);
    return response;
  }

  const data = await fastapiRes.json();
  const jwt = data.access_token;

  const userRes = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
  });
  const user = userRes.ok ? await userRes.json() : null;
  const redirectTo = user?.has_blizzard ? "/profile" : "/onboarding";

  const response = NextResponse.redirect(absoluteUrl(redirectTo, request));
  response.cookies.set("token", jwt, authCookieOptions(60 * 60 * 24));
  clearOauthCookie(response, DISCORD_OAUTH_COOKIE);

  return response;
}
