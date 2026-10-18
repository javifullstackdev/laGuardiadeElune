import { proxyApi } from "@/lib/proxy-api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const professionId = searchParams.get("profession_id") ?? "";
  const params = new URLSearchParams({ q, profession_id: professionId });
  return proxyApi(`/craft-orders/items/search?${params}`);
}
