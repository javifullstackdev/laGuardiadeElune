import { cookies } from "next/headers";

import { apiUrl } from "@/lib/api";

/** PATCH /api/admin/players/:userId/display-name — apodo visible en ranking */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(
    apiUrl(`/users/${encodeURIComponent(userId)}/display-name`),
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ display_name: body.display_name ?? null }),
    }
  );

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
