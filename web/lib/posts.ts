export type Category = {
  value: string;
  label: string;
  icon: string;
  // Clases Tailwind para la badge
  badge: string;
};

export const CATEGORIES: Category[] = [
  {
    value: "noticias",
    label: "Noticias",
    icon: "📢",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  {
    value: "raids",
    label: "Raids",
    icon: "⚔️",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
  },
  {
    value: "eventos",
    label: "Eventos",
    icon: "📅",
    badge: "bg-green-500/20 text-green-300 border border-green-500/30",
  },
  {
    value: "lore",
    label: "Lore",
    icon: "📖",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  },
  {
    value: "guias",
    label: "Guías",
    icon: "🎮",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  },
  {
    value: "miticas",
    label: "Míticas+",
    icon: "🗝️",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  },
];

/** Devuelve los estilos de badge para una categoría dada (o un fallback genérico) */
export function getCategoryStyle(value: string | null): Category {
  return (
    CATEGORIES.find((c) => c.value === value?.toLowerCase()) ?? {
      value: value ?? "",
      label: value ?? "Sin categoría",
      icon: "📌",
      badge: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    }
  );
}

/** Formatea una fecha ISO en español */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Convierte texto plano en párrafos (split por línea en blanco) */
export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)          // doble salto de línea
    .map((p) => p.trim())
    .filter(Boolean);
}
