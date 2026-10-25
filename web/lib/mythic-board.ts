import type { Post } from "@/lib/posts";

export type MythicPlayer = {
  character_name: string | null;
  character_realm: string | null;
  username: string;
  points: number;
  amount: number;
  weekly_capped: boolean;
};

export type MythicRun = {
  id: string;
  dungeon: string;
  dungeon_image_url: string | null;
  mythic_level: number | null;
  timed: boolean | null;
  completed_at: string;
  guild_characters: string[];
  players: MythicPlayer[];
};

export function mythicToPost(run: MythicRun): Post {
  const level = run.mythic_level != null ? `+${run.mythic_level}` : "";
  const title = level ? `${run.dungeon} ${level}` : run.dungeon;
  const names = run.players
    .map((player) => player.character_name || player.username)
    .filter(Boolean);
  const pace = run.timed === false ? "Fuera de tiempo" : "A tiempo";
  const who = names.join(", ");
  return {
    id: run.id,
    title,
    content: who || pace,
    subtitle: who ? `${pace} · ${who}` : pace,
    category: "miticas",
    published_at: run.completed_at,
    cover_url: run.dungeon_image_url,
  };
}
