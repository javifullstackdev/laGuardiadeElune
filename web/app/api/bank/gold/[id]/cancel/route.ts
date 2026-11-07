import { proxyApi } from "@/lib/proxy-api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyApi(`/bank/gold/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}
