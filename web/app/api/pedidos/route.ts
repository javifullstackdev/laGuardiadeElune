import { proxyApi } from "@/lib/proxy-api";

export async function GET() {
  return proxyApi("/craft-orders");
}

export async function POST(req: Request) {
  return proxyApi("/craft-orders", { method: "POST", body: await req.text() });
}
