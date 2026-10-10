import { apiUrl } from "@/lib/api";
export async function GET() {
  const res = await fetch(apiUrl("/bios/questions"), { cache: "no-store" });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
