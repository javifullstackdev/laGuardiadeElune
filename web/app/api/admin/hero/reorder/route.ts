import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
export async function POST(req: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(apiUrl("/hero/reorder"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
