import type { Post } from "@/lib/posts";

export type CraftBoardCard = {
  id: string;
  profession_id: number;
  profession_name: string;
  item_name: string;
  quantity: number;
  created_at: string | null;
};

const COVERS: Record<number, string> = {
  164: "/craft/professions-blacksmithing.webp",
  165: "/craft/professions-leatherworking.webp",
  171: "/craft/professions-alchemy.webp",
  197: "/craft/professions-tailoring.webp",
  202: "/craft/professions-engineering.webp",
  333: "/craft/professions-enchanting.webp",
  755: "/craft/professions-jewelcrafting.webp",
  773: "/craft/professions-inscription.webp",
  185: "/craft/professions-cooking.webp",
  356: "/craft/professions-fishing.webp",
};

export function professionCover(professionId: number): string | null {
  return COVERS[professionId] ?? null;
}

export function boardToPost(card: CraftBoardCard): Post {
  return {
    id: card.id,
    title: `${card.quantity}× ${card.item_name}`,
    content: card.profession_name,
    subtitle: card.profession_name,
    category: "pedidos",
    published_at: card.created_at ?? new Date().toISOString(),
    cover_url: professionCover(card.profession_id),
  };
}
