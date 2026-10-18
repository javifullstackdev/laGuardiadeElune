import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const res = await fetch(apiUrl("/notifications/seen"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
