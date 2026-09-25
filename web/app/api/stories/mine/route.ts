import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json(null, { status: 401 });
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const realm = searchParams.get("realm") ?? "";
  const res = await fetch(
    `http://localhost:8000/stories/mine?name=${encodeURIComponent(name)}&realm=${encodeURIComponent(realm)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (res.status === 200) {
    const text = await res.text();
    return new Response(text || "null", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const data = await res.json().catch(() => null);
  return Response.json(data, { status: res.status });
}
