import { cookies } from "next/headers";
import NavbarMobile from "./NavbarMobile";
import NavbarLinks from "./NavbarLinks";

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

  const items = [
    { href: "/", label: "Inicio" },
    { href: "/ranking", label: "Ranking" },
    ...(token
      ? [
          { href: "/profile", label: "Perfil" },
          ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          { href: "/api/auth/logout", label: "Salir" },
        ]
      : [
          {
            href: "http://localhost:8000/auth/discord/login",
            label: "Entrar",
            external: true,
          },
        ]),
  ];

  const mobileLinks = items.map((item) => ({
    href: item.href,
    label: item.label,
    style: "default" as const,
    external: "external" in item ? item.external : item.href.startsWith("/api/") || item.href.startsWith("http"),
  }));

  return (
    <nav className="sticky top-0 z-50 h-12 bg-[#0b0b0b] text-white px-4 sm:px-6 flex items-center justify-end gap-6 transition-opacity duration-700 ease-out">
      <NavbarLinks items={items} />

      <div className="md:hidden">
        <NavbarMobile links={mobileLinks} username={user?.username ?? null} />
      </div>
    </nav>
  );
}
