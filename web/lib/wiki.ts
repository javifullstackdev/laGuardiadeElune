export type PublicFields = {
  title: boolean;
  age: boolean;
  origin: boolean;
  residence: boolean;
  race: boolean;
  class: boolean;
  faction: boolean;
  personality: boolean;
  appearance: boolean;
};

export const DEFAULT_PUBLIC_FIELDS: PublicFields = {
  title: true,
  age: true,
  origin: true,
  residence: true,
  race: true,
  class: true,
  faction: true,
  personality: true,
  appearance: true,
};

export const PUBLIC_FIELD_LABELS: { key: keyof PublicFields; label: string }[] = [
  { key: "title", label: "Título" },
  { key: "age", label: "Edad" },
  { key: "origin", label: "Origen" },
  { key: "residence", label: "Residencia" },
  { key: "race", label: "Raza" },
  { key: "class", label: "Clase" },
  { key: "faction", label: "Facción" },
  { key: "personality", label: "Personalidad" },
  { key: "appearance", label: "Aspecto físico" },
];

export function mergePublicFields(raw: Partial<PublicFields> | null | undefined): PublicFields {
  return { ...DEFAULT_PUBLIC_FIELDS, ...(raw ?? {}) };
}

export type WikiListItem = {
  name: string;
  realm: string;
  display_name: string;
  title: string | null;
  cover_url: string | null;
  excerpt: string | null;
  wow_class: string | null;
  race: string | null;
};

export type WikiRelated = {
  name: string;
  realm: string;
  story_count: number;
  relation_types: string[];
  has_page: boolean;
  cover_url: string | null;
  title: string | null;
};

export type WikiStory = {
  id: string;
  title: string;
  published_at: string | null;
};

export type WikiCharacter = {
  name: string;
  realm: string;
  display_name: string;
  title: string | null;
  cover_url: string | null;
  biography: string | null;
  personality: string | null;
  appearance: string | null;
  origin: string | null;
  age_lore: number | null;
  residence: string | null;
  wow_class: string | null;
  race: string | null;
  faction: string | null;
  author_username: string;
  related: WikiRelated[];
  stories: WikiStory[];
};
