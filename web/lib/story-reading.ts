export const STORY_READING_COOKIE = "story_reading";

export type StoryReadingMode = "parchment" | "comfort";

export function parseStoryReadingMode(value: string | undefined | null): StoryReadingMode {
  return value === "comfort" ? "comfort" : "parchment";
}
