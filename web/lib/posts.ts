export type Category = {
  value: string;
  label: string;
  badge: string;
  flag: string;
};

export const CATEGORIES: Category[] = [
  {
    value: "noticias",
    label: "Noticias",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    flag: "bg-lime-500 text-black",
  },
  {
    value: "raids",
    label: "Raids",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
    flag: "bg-red-600 text-white",
  },
  {
    value: "eventos",
    label: "Eventos",
    badge: "bg-green-500/20 text-green-300 border border-green-500/30",
    flag: "bg-lime-500 text-black",
  },
  {
    value: "lore",
    label: "Lore",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    flag: "bg-purple-500 text-white",
  },
  {
    value: "guias",
    label: "Guías",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    flag: "bg-yellow-400 text-black",
  },
  {
    value: "miticas",
    label: "Míticas+",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    flag: "bg-orange-500 text-black",
  },
];

export function getCategoryStyle(value: string | null): Category {
  return (
    CATEGORIES.find((c) => c.value === value?.toLowerCase()) ?? {
      value: value ?? "",
      label: value ?? "Sin categoría",
      badge: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
      flag: "bg-gray-500 text-white",
    }
  );
}

export type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
  subtitle: string | null;
  cover_url: string | null;
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function postSubtitle(post: { subtitle?: string | null; content: string }): string {
  if (post.subtitle?.trim()) return post.subtitle.trim();
  const first = post.content.split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  return first.length > 110 ? first.slice(0, 110).trimEnd() + "…" : first;
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
