export async function GET() {
  const res = await fetch("http://localhost:8000/bios/questions", { cache: "no-store" });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
