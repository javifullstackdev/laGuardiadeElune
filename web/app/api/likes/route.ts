import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target_type = searchParams.get("target_type") ?? "";
  const target_id = searchParams.get("target_id") ?? "";
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(
    apiUrl(`/likes/?target_type=${encodeURIComponent(target_type)}&target_id=${encodeURIComponent(target_id)}`),
    { headers, cache: "no-store" },
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(apiUrl("/likes/"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
