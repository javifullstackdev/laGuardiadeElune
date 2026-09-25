export const RELATION_TYPES: { value: string; label: string }[] = [
  { value: "ally", label: "Aliado/a" },
  { value: "rival", label: "Rival" },
  { value: "family", label: "Familiar" },
  { value: "mentor", label: "Mentor" },
  { value: "apprentice", label: "Aprendiz" },
  { value: "friend", label: "Amigo/a" },
  { value: "enemy", label: "Enemigo/a" },
  { value: "romantic", label: "Interés romántico" },
  { value: "companion", label: "Compañero/a de aventuras" },
];

export function relationLabel(type: string) {
  return RELATION_TYPES.find((r) => r.value === type)?.label ?? type;
}

export type StoryRelation = {
  name: string;
  realm: string;
  relation_type: string;
  met_at: string | null;
  note: string | null;
  status: string;
  owner_username: string;
};

export type RelationClaim = {
  id: string;
  story_id: string;
  story_title: string;
  from_name: string;
  from_realm: string;
  author_username: string;
  relation_type: string;
  met_at: string | null;
  note: string | null;
  status: string;
};
