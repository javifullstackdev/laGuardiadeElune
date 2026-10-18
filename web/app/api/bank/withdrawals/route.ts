import { proxyApi } from "@/lib/proxy-api";

export async function POST(req: Request) {
  return proxyApi("/bank/withdrawals", { method: "POST", body: await req.text() });
}
