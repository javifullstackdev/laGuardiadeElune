import { proxyApi } from "@/lib/proxy-api";

export async function POST(req: Request) {
  return proxyApi("/bank/deposits", { method: "POST", body: await req.text() });
}
