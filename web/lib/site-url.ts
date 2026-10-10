import type { NextRequest } from "next/server";

/** Public site origin for redirects behind Caddy/Docker (not 0.0.0.0:3000). */
export function siteOrigin(request?: NextRequest): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  return "https://www.laguardiadeelune.com";
}

export function absoluteUrl(path: string, request?: NextRequest): URL {
  const base = siteOrigin(request);
  return new URL(path.startsWith("/") ? path : `/${path}`, `${base}/`);
}
