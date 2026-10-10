import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
async function token() {
  return (await cookies()).get("token")?.value;
}

export async function GET() {
  const auth = await token();
  if (!auth) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const res = await fetch(apiUrl("/hero/admin"), {
    headers: { Authorization: `Bearer ${auth}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const auth = await token();
  if (!auth) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(apiUrl("/hero/"), {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
