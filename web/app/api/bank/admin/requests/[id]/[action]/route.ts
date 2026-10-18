import { proxyApi } from "@/lib/proxy-api";

const ACTIONS = new Set(["approve", "reject", "complete"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json({ detail: "Acción no válida" }, { status: 400 });
  }
  return proxyApi(`/bank/admin/requests/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: await req.text(),
  });
}
