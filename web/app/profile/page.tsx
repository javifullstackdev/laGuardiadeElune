import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-store",
  };

  // Peticiones en paralelo para reducir el tiempo de carga
  const [userRes, charsRes, txRes] = await Promise.all([
    fetch("http://localhost:8000/users/me",           { headers, cache: "no-store" }),
    fetch("http://localhost:8000/characters/my",      { headers, cache: "no-store" }),
    fetch("http://localhost:8000/users/me/transactions?limit=10", { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");

  const user         = await userRes.json();
  const characters   = charsRes.ok ? await charsRes.json() : [];
  const transactions = txRes.ok    ? await txRes.json()    : [];

  // Ordenar: main primero, luego alts por nombre
  const sorted = [...characters].sort((a, b) => {
    if (b.is_main !== a.is_main) return b.is_main ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ProfileClient
      user={user}
      characters={sorted}
      transactions={transactions}
    />
  );
}
