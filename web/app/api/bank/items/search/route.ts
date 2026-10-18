import { proxyApi } from "@/lib/proxy-api";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return proxyApi(`/bank/items/search?q=${encodeURIComponent(q)}`);
}
