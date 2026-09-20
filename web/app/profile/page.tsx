import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/");
  }

  const res = await fetch("http://localhost:8000/users/me", {
    headers: { "Cookie": `token=${token}` },
    cache: "no-store",
  });

  if (!res.ok) redirect("/");

  const user = await res.json();
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-8">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt="Avatar"
            className="w-16 h-16 rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-gray-500">{user.guild_title}</p>
        </div>
      </div>

      {/* Info principal */}
      <div className="flex flex-col gap-2 mb-8">
        <p><span className="font-semibold">Rol:</span> {user.role}</p>
        <p><span className="font-semibold">Itinerario:</span> {user.path}</p>
        <p><span className="font-semibold">Puntos totales:</span> {user.total_points}</p>
      </div>

      {/* Battle.net */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-bold mb-3">⚔️ Battle.net</h2>

        {error === "bnet_failed" && (
          <p className="text-red-500 mb-3 text-sm">
            Error al vincular Battle.net. Inténtalo de nuevo.
          </p>
        )}
        {error === "bnet_cancelled" && (
          <p className="text-yellow-500 mb-3 text-sm">
            Vinculación cancelada.
          </p>
        )}

        {user.has_blizzard ? (
          <div className="flex items-center gap-3">
            <span className="text-green-500">✅ Conectado</span>
            <span className="text-gray-600 font-mono">{user.blizzard_battletag}</span>
            <a href="/personajes" className="ml-auto text-blue-500 underline text-sm">
              Ver mis personajes →
            </a>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-sm mb-3">
              Conecta tu cuenta de Battle.net para verificar tus personajes de WoW
              automáticamente.
            </p>
            {/* Este enlace va a FastAPI que redirige a Blizzard OAuth */}
            <a
              href="http://localhost:8000/auth/blizzard/login"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔗 Conectar Battle.net
            </a>
          </div>
        )}
      </div>

    </main>
  );
}
