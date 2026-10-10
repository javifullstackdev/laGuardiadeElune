import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";
/** GET /api/characters/search?q=... — busca personajes del gremio */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q) return Response.json([]);

  const res = await fetch(
    apiUrl(`/characters/search?q=${encodeURIComponent(q)}`),
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
