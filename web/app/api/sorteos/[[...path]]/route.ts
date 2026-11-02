import { proxyApi } from "@/lib/proxy-api";

type Ctx = { params: Promise<{ path?: string[] }> };

async function forward(req: Request, ctx: Ctx, method: string) {
  const { path } = await ctx.params;
  if (path?.some((part) => part === ".." || part.includes("/"))) {
    return Response.json({ detail: "Ruta no válida" }, { status: 400 });
  }
  const suffix = path?.length ? `/${path.join("/")}` : "";
  const hasBody = method !== "GET" && method !== "DELETE";
  const body = hasBody ? await req.text() : undefined;
  return proxyApi(`/draws${suffix}`, { method, body: body || undefined });
}

export function GET(req: Request, ctx: Ctx) {
  return forward(req, ctx, "GET");
}

export function POST(req: Request, ctx: Ctx) {
  return forward(req, ctx, "POST");
}

export function PATCH(req: Request, ctx: Ctx) {
  return forward(req, ctx, "PATCH");
}

export function DELETE(req: Request, ctx: Ctx) {
  return forward(req, ctx, "DELETE");
}
