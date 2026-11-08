import { apiUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

/** JPEG que WhatsApp y Discord muestran al pegar /objetivo. */
export async function GET() {
  try {
    const res = await fetch(apiUrl("/bank/gold/card.jpg"), { cache: "no-store" });
    if (!res.ok) return new Response("No disponible", { status: 502 });
    const bytes = await res.arrayBuffer();
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("No disponible", { status: 502 });
  }
}
