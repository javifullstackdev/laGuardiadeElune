import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect("http://localhost:3000/");
  response.cookies.set("token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}