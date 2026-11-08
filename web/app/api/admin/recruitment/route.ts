import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function GET() {
  const token = (await cookies()).get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const res = await fetch(apiUrl("/recruitment/admin"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
