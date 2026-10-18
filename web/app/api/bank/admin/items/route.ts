import { proxyApi } from "@/lib/proxy-api";

export async function GET() {
  return proxyApi("/bank/admin/items");
}

export async function POST(req: Request) {
  return proxyApi("/bank/admin/items", { method: "POST", body: await req.text() });
}
