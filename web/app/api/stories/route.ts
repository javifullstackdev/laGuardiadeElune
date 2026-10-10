import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
export async function GET() {
  const res = await fetch(apiUrl("/stories/"), { cache: "no-store" });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });

  const incoming = await req.formData();
  const upstream = new FormData();
  for (const [key, value] of incoming.entries()) {
    if (value instanceof File) {
      if (value.size > 0) upstream.append(key, value);
    } else {
      upstream.append(key, value);
    }
  }

  const res = await fetch(apiUrl("/stories/submit"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upstream,
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
