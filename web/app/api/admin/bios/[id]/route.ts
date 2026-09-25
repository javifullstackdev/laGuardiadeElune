import { cookies } from "next/headers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const body = await req.json();
  const action = body.action === "reject" ? "reject" : "publish";
  const res = await fetch(`http://localhost:8000/bios/${id}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: body.reason ?? null,
      biography: body.biography ?? "",
      personality: body.personality ?? null,
      appearance: body.appearance ?? null,
    }),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
