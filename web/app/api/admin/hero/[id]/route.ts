import { cookies } from "next/headers";

async function token() {
  return (await cookies()).get("token")?.value;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await token();
  if (!auth) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`http://localhost:8000/hero/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await token();
  if (!auth) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const res = await fetch(`http://localhost:8000/hero/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${auth}` },
  });
  if (res.status === 204) return new Response(null, { status: 204 });
  const data = await res.json().catch(() => ({ detail: "Error" }));
  return Response.json(data, { status: res.status });
}
