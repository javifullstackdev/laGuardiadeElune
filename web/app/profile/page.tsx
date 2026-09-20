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

  // 1. Obtener usuario y personajes en paralelo
  const [userRes, charsRes, txRes] = await Promise.all([
    fetch("http://localhost:8000/users/me",           { headers, cache: "no-store" }),
    fetch("http://localhost:8000/characters/my",      { headers, cache: "no-store" }),
    fetch("http://localhost:8000/users/me/transactions?limit=10", { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");

  const user       = await userRes.json();
  let characters   = charsRes.ok ? await charsRes.json() : [];
  const transactions = txRes.ok  ? await txRes.json()    : [];

  // 2. Si hay personajes Retail sin render_url o con render de baja calidad (avatar),
  //    ejecutar sync ANTES de renderizar para que la primera visita ya muestre las imágenes.
  const needsSync = user.has_blizzard && characters.some(
    (c: { game: string; render_url: string | null }) =>
      c.game !== "forever" && (!c.render_url || (c.render_url as string).endsWith("-avatar.jpg"))
  );
  if (needsSync) {
    try {
      await fetch("http://localhost:8000/characters/sync-blizzard-ids", {
        method: "POST", headers, cache: "no-store",
      });
      // Re-fetch personajes para obtener las render_url recién guardadas
      const updatedCharsRes = await fetch("http://localhost:8000/characters/my", {
        headers, cache: "no-store",
      });
      if (updatedCharsRes.ok) {
        characters = await updatedCharsRes.json();
      }
    } catch {
      // Si falla el sync no bloqueamos la página
    }
  }

  // 3. Detectar si el token de Blizzard parece caducado:
  //    si hay personajes retail sin render de calidad después del sync, probablemente el token expiró.
  const retailChars = characters.filter((c: { game: string }) => c.game !== "forever");
  const bnetTokenExpired = user.has_blizzard && retailChars.length > 0 && retailChars.every(
    (c: { render_url: string | null; custom_avatar_url: string | null }) =>
      !c.custom_avatar_url && (!c.render_url || (c.render_url as string).endsWith("-avatar.jpg"))
  );
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
