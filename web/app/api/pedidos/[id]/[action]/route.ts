import { proxyApi } from "@/lib/proxy-api";

const ACTIONS = new Set(["claim", "cancel", "finish", "collect", "complete"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json({ detail: "Acción no válida" }, { status: 400 });
  }
  const body = await req.text();
  return proxyApi(`/craft-orders/${id}/${action}`, {
    method: "POST",
    body: body || "{}",
  });
}
