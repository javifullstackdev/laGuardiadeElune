import { cookies } from "next/headers";
import Link from "next/link";
import NavbarMobile from "./NavbarMobile";

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

  // Links para el menú móvil
  const mobileLinks = [
    { href: "/",        label: "Posts",   style: "default" as const },
    { href: "/ranking", label: "Ranking", style: "default" as const },
    ...(token ? [
      { href: "/profile", label: "Mi perfil", style: "default" as const },
      ...(isAdmin ? [{ href: "/admin", label: "Admin", style: "admin" as const }] : []),
      { href: "/api/auth/logout", label: "Cerrar sesión", style: "logout" as const },
    ] : [
      { href: "http://localhost:8000/auth/discord/login", label: "Iniciar sesión con Discord", style: "login" as const, external: true },
    ]),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 text-white px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold shrink-0">
        La Guardia de Elune
      </Link>

      {/* Links desktop (ocultos en mobile) */}
      <div className="hidden md:flex items-center gap-6">
        <Link href="/" className="hover:text-gray-300 text-sm">
          Posts
        </Link>
        <Link href="/ranking" className="hover:text-gray-300 text-sm">
          Ranking
        </Link>
        {token ? (
          <>
            <Link href="/profile" className="hover:text-gray-300 text-sm">
              Mi perfil
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
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

      {/* Hamburguesa + drawer (solo mobile) */}
      <NavbarMobile links={mobileLinks} username={user?.username ?? null} />
    </nav>
  );
}
