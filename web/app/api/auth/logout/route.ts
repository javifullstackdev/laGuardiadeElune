import { NextRequest, NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/auth-cookie";
import { absoluteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(absoluteUrl("/", request));
  response.cookies.set("token", "", authCookieOptions(0));
  return response;
}
