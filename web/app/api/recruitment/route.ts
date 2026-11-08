import { apiUrl } from "@/lib/api";

/** POST /api/recruitment — solicitud pública, sin cuenta. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ detail: "Solicitud incompleta" }, { status: 400 });
  }
  const res = await fetch(apiUrl("/recruitment/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: typeof body.first_name === "string" ? body.first_name : "",
      last_name: typeof body.last_name === "string" ? body.last_name : "",
      reason: typeof body.reason === "string" ? body.reason : "",
      company: typeof body.company === "string" ? body.company : "",
    }),
  });
  const data = await res.json().catch(() => ({ detail: "No se ha podido enviar" }));
  return Response.json(data, { status: res.status });
}
