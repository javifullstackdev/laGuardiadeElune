import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/** Opciones de la cookie JWT de sesión. */
export function authCookieOptions(maxAge: number): Partial<ResponseCookie> {
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    path: "/",
    maxAge,
    sameSite: "lax",
    secure,
  };
}
