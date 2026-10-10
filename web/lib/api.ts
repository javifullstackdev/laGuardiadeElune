/**
 * Base URL de FastAPI.
 * - Server (RSC / route handlers): API_URL (en Docker: http://api:8000)
 * - Fallback local: http://localhost:8000
 */
export function getApiBase(): string {
  const base =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8000";
  return base.replace(/\/$/, "");
}

/** URL absoluta hacia un path de la API (uso server-side). */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${p}`;
}

/**
 * Origen público de la API para enlaces en el navegador (OAuth, etc.).
 * - Local: http://localhost:8000
 * - Prod con Caddy same-origin: NEXT_PUBLIC_API_URL="" → rutas relativas /auth/...
 */
export function getPublicApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL !== undefined) {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, "");
  }
  return "http://localhost:8000";
}

export function publicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getPublicApiBase();
  return `${base}${p}`;
}
