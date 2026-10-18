import { proxyApi } from "@/lib/proxy-api";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyApi(`/bank/admin/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: await req.text(),
  });
}
