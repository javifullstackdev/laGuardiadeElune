import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { birthday } = await req.json();

  const res = await fetch("http://localhost:8000/users/me/birthday", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ birthday }),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
