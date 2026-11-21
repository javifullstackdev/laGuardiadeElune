import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiUrl } from "@/lib/api";
import AdminFrame from "./AdminFrame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/");

  const res = await fetch(apiUrl("/users/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/");
  const user = await res.json();
  if (user.role !== "admin") redirect("/");

  return <AdminFrame username={user.username}>{children}</AdminFrame>;
}
