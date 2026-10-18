import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ unread: 0, items: [] }, { status: 200 });
  const res = await fetch(apiUrl("/notifications"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
