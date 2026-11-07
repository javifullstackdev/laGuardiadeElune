import { proxyApi } from "@/lib/proxy-api";

export async function PATCH(req: Request) {
  return proxyApi("/bank/gold/admin/settings", { method: "PATCH", body: await req.text() });
}
