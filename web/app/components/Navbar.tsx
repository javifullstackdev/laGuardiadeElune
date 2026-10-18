import { cookies } from "next/headers";
import NavbarMobile from "./NavbarMobile";
import NavbarLinks from "./NavbarLinks";
import NavbarBrand from "./NavbarBrand";

import { apiUrl, publicApiUrl } from "@/lib/api";
export default async function Navbar() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let user = null;
  if (token) {
    const res = await fetch(apiUrl("/users/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) user = await res.json();
  }

  const isAdmin = user?.role === "admin" || user?.role === "officer";
  const unread = Number(user?.unread_notifications ?? 0);

  const items = [
    { href: "/", label: "Inicio" },
    { href: "/posts", label: "Tablón" },
    { href: "/personajes", label: "Personajes" },
    { href: "/lore", label: "Historias" },
    ...(token
      ? [
          { href: "/ranking", label: "Ranking" },
          { href: "/banco", label: "Banco" },
          { href: "/pedidos", label: "Pedidos" },
          { href: "/profile", label: "Perfil", badge: unread },
          ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          { href: "/api/auth/logout", label: "Salir" },
        ]
      : [
          {
            href: publicApiUrl("/auth/discord/login"),
            label: "Entrar",
            external: true,
          },
        ]),
  ];

  const mobileLinks = items.map((item) => {
    const href = item.href;
    const external =
      "external" in item
        ? Boolean(item.external)
        : href.startsWith("/api/") || href.startsWith("http");
    const style =
      href === "/admin" || href.startsWith("/admin/")
        ? ("admin" as const)
        : href.includes("/auth/logout")
          ? ("logout" as const)
          : href.includes("/auth/discord")
            ? ("login" as const)
            : ("default" as const);
    const badge = "badge" in item ? Number(item.badge ?? 0) : 0;
    return { href, label: item.label, style, external, badge };
  });

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-12 bg-[#0b0b0b] text-white px-4 sm:px-6 flex items-center justify-end gap-4 sm:gap-6 transition-opacity duration-700 ease-out">
      <NavbarBrand />
      <NavbarLinks items={items} />

      <div className="md:hidden">
        <NavbarMobile links={mobileLinks} username={user?.username ?? null} />
      </div>
    </nav>
  );
}
