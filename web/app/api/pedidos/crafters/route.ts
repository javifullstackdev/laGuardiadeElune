import { proxyApi } from "@/lib/proxy-api";

export async function GET() {
  return proxyApi("/craft-orders/crafters");
}
