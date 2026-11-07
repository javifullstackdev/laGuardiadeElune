import { timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";

import { authCookieOptions } from "@/lib/auth-cookie";

export const DISCORD_OAUTH_COOKIE = "discord_oauth_state";
export const BLIZZARD_OAUTH_COOKIE = "blizzard_oauth_state";

export function oauthStateMatches(saved: string | undefined, got: string | null): got is string {
  if (!saved || !got) return false;
  const left = Buffer.from(saved);
  const right = Buffer.from(got);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function clearOauthCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", authCookieOptions(0));
}
