import type { StoryRelation } from "./relations";

export type StoryPublic = {
  id: string;
  title: string;
  status?: "pending" | "approved" | "rejected";
  biography: string | null;
  personality: string | null;
  appearance: string | null;
  published_at: string | null;
  character_name: string;
  character_realm: string;
  character_class: string | null;
  cover_url: string | null;
  author_username: string;
  like_count: number;
  relations: StoryRelation[];
};

export type StoryMine = {
  id: string;
  status: "pending" | "approved" | "rejected";
  title: string;
  rejection_reason: string | null;
  submitted_at: string;
  published_at: string | null;
  awaiting_relations: boolean;
  cover_url: string | null;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
};

export type StoryPending = {
  id: string;
  title: string;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
  submitted_at: string;
  character_name: string;
  character_realm: string;
  author_username: string;
  relations: StoryRelation[];
  awaiting_relations: boolean;
  cover_url: string | null;
};

export function storyExcerpt(story: Pick<StoryPublic, "biography" | "personality" | "appearance">): string {
  const text = story.biography || story.personality || story.appearance || "";
  const first = text.replace(/\s+/g, " ").trim();
  return first.length > 110 ? first.slice(0, 110).trimEnd() + "…" : first;
}
