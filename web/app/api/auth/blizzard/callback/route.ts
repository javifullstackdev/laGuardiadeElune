import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";
import { absoluteUrl } from "@/lib/site-url";
import { BLIZZARD_OAUTH_COOKIE, clearOauthCookie, oauthStateMatches } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const saved = request.cookies.get(BLIZZARD_OAUTH_COOKIE)?.value;

  if (!code || !saved || !oauthStateMatches(saved, state)) {
    const response = NextResponse.redirect(
      absoluteUrl(`/profile?error=${code ? "bnet_state" : "bnet_cancelled"}`, request),
    );
    clearOauthCookie(response, BLIZZARD_OAUTH_COOKIE);
    return response;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    const response = NextResponse.redirect(absoluteUrl("/", request));
    clearOauthCookie(response, BLIZZARD_OAUTH_COOKIE);
    return response;
  }

  const res = await fetch(apiUrl("/auth/blizzard/link"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Cookie: `${BLIZZARD_OAUTH_COOKIE}=${saved}`,
    },
    body: JSON.stringify({ code, state }),
    cache: "no-store",
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Error vinculando Battle.net:", error);
    const response = NextResponse.redirect(absoluteUrl("/profile?error=bnet_failed", request));
    clearOauthCookie(response, BLIZZARD_OAUTH_COOKIE);
    return response;
  }

  const charsRes = await fetch(apiUrl("/characters/my"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const chars = charsRes.ok ? await charsRes.json() : [];
  const dest = Array.isArray(chars) && chars.length > 0 ? "/profile" : "/onboarding";
  const response = NextResponse.redirect(absoluteUrl(dest, request));
  clearOauthCookie(response, BLIZZARD_OAUTH_COOKIE);
  return response;
}
