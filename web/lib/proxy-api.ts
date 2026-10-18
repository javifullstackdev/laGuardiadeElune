import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function proxyApi(path: string, init?: RequestInit) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
