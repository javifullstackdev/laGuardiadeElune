export type Category = {
  value: string;
  label: string;
  badge: string;
};

export const CATEGORIES: Category[] = [
  {
    value: "noticias",
    label: "Noticias",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  {
    value: "raids",
    label: "Raids",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
  },
  {
    value: "eventos",
    label: "Eventos",
    badge: "bg-green-500/20 text-green-300 border border-green-500/30",
  },
  {
    value: "lore",
    label: "Lore",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  },
  {
    value: "guias",
    label: "Guías",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  },
  {
    value: "miticas",
    label: "Míticas+",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  },
];

export function getCategoryStyle(value: string | null): Category {
  return (
    CATEGORIES.find((c) => c.value === value?.toLowerCase()) ?? {
      value: value ?? "",
      label: value ?? "Sin categoría",
      badge: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    }
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
