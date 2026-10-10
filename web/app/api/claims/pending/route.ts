import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json([], { status: 200 });
  const res = await fetch(apiUrl("/claims/pending"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
