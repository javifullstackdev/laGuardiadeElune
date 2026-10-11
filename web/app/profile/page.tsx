import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

import { apiUrl } from "@/lib/api";
export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-store",
  };

  // 1. Obtener usuario y personajes en paralelo
  const [userRes, charsRes, txRes] = await Promise.all([
    fetch(apiUrl("/users/me"),           { headers, cache: "no-store" }),
    fetch(apiUrl("/characters/my"),      { headers, cache: "no-store" }),
    fetch(apiUrl("/users/me/transactions?limit=200"), { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");

  const user       = await userRes.json();
  let characters   = charsRes.ok ? await charsRes.json() : [];
  const transactions = txRes.ok  ? await txRes.json()    : [];

  // 2. Si faltan datos de identidad, render o cara Blizzard, sync antes de pintar.
  const needsSync = characters.some(
    (c: {
      game: string;
      render_url: string | null;
      face_url: string | null;
      race: string | null;
      faction: string | null;
      wow_class: string | null;
      gender: string | null;
    }) =>
      c.game !== "forever" && (
        !c.race
        || !c.faction
        || !c.wow_class
        || !c.gender
        || (user.has_blizzard && (
          !c.render_url
          || !c.face_url
          || (c.render_url as string).endsWith("-avatar.jpg")
        ))
      )
  );
  if (needsSync) {
    try {
      await fetch(apiUrl("/characters/sync-blizzard-ids"), {
        method: "POST", headers, cache: "no-store",
      });
      // Re-fetch personajes para obtener las render_url recién guardadas
      const updatedCharsRes = await fetch(apiUrl("/characters/my"), {
        headers, cache: "no-store",
      });
      if (updatedCharsRes.ok) {
        characters = await updatedCharsRes.json();
      }
    } catch {
      // Si falla el sync no bloqueamos la página
    }
  }

  // 3. Aviso de reconexión solo si el token de usuario está realmente caducado
  //    (no confundir con renders antiguos -avatar.jpg; esos se actualizan en el sync).
  const bnetTokenExpired = Boolean(user.has_blizzard && user.blizzard_token_expired);
  const sorted = [...characters].sort((a, b) => {
    if (b.is_main !== a.is_main) return b.is_main ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ProfileClient
      user={user}
      characters={sorted}
      transactions={transactions}
      bnetTokenExpired={bnetTokenExpired}
    />
  );
}
