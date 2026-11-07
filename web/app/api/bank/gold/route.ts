import { proxyApi } from "@/lib/proxy-api";

export async function GET() {
  return proxyApi("/bank/gold");
}

export async function POST(req: Request) {
  return proxyApi("/bank/gold", { method: "POST", body: await req.text() });
}
