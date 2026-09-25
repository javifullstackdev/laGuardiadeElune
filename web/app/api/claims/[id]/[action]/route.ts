import { cookies } from "next/headers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (action !== "confirm" && action !== "reject") {
    return Response.json({ detail: "Acción no válida" }, { status: 400 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ detail: "No autenticado" }, { status: 401 });
  const res = await fetch(`http://localhost:8000/claims/${id}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
