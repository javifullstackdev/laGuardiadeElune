import { cookies } from "next/headers";
import Link from "next/link";

export default async function Navbar() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let user = null;
  if (token) {
    const res = await fetch("http://localhost:8000/users/me", {
      headers: { Cookie: `token=${token}` },
      cache: "no-store",
    });
    if (res.ok) user = await res.json();
  }

  const isAdmin = user?.role === "admin" || user?.role === "officer";

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">
        La Guardia de Elune
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/" className="hover:text-gray-300">
          Posts
        </Link>
        {token ? (
          <>
            <Link href="/profile" className="hover:text-gray-300">
              Mi perfil
            </Link>
            {isAdmin && (
              <Link href="/admin/posts" className="hover:text-gray-300">
                Admin
              </Link>
            )}
            <a
              href="/api/auth/logout"
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
            >
              Cerrar sesión
            </a>
          </>
        ) : (
          <a
            href="http://localhost:8000/auth/discord/login"
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm"
          >
            Iniciar sesión con Discord
          </a>
        )}
      </div>
    </nav>
  );
}