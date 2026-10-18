import { proxyApi } from "@/lib/proxy-api";

export async function GET() {
  return proxyApi("/craft-orders/admin");
}

export async function PUT(req: Request) {
  return proxyApi("/craft-orders/admin", { method: "PUT", body: await req.text() });
}
