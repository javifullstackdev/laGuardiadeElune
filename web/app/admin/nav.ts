export type AdminNavItem = {
  href: string;
  title: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Personas",
    items: [
      { href: "/admin/players", title: "Jugadores" },
      { href: "/admin/reclutamiento", title: "Reclutamiento" },
    ],
  },
  {
    label: "Fichas",
    items: [
      { href: "/admin/bios", title: "Fichas" },
      { href: "/admin/stories", title: "Historias" },
      { href: "/admin/titles", title: "Títulos" },
    ],
  },
  {
    label: "Tablón",
    items: [
      { href: "/admin/posts", title: "Posts" },
      { href: "/admin/carousel", title: "Carrusel" },
      { href: "/admin/likes", title: "Likes" },
    ],
  },
  {
    label: "Imágenes",
    items: [
      { href: "/admin/avatars", title: "Imágenes pendientes" },
      { href: "/admin/image-requests", title: "Solicitudes de imagen" },
    ],
  },
  {
    label: "Hermandad",
    items: [
      { href: "/admin/points", title: "Puntos" },
      { href: "/admin/banco", title: "Banco" },
      { href: "/admin/pedidos", title: "Pedidos" },
      { href: "/sorteos", title: "Sorteos" },
    ],
  },
];

export function adminNavCurrent(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
