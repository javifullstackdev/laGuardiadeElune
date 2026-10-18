export type Bucket = "competitive" | "campaign";

export type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  points_start_at: string | null;
};

export type CapStatus = Record<Bucket, { accrued: number; used: number; available: number }>;

export type Transaction = {
  amount: number;
  reason: string;
  event_category: string | null;
  bucket: Bucket;
  created_at: string;
  occurred_at: string;
  week_start: string | null;
  weekly_capped: boolean;
  counted_amount: number;
};

export const BUCKET_LABEL: Record<Bucket, string> = {
  competitive: "Competitivo",
  campaign: "Campaña",
};

export const PATH_LABEL: Record<string, string> = {
  competitive: "Competitivo",
  campaign: "Campaña",
  hybrid: "Híbrido",
};

export const CATEGORY_LABEL: Record<string, string> = {
  mythic_plus: "Míticas+",
  raid: "Banda",
  pvp: "JcJ",
  guild_event: "Evento de hermandad",
  timewalking: "Paseo en el tiempo",
  housing: "Housing",
  lore_post: "Lore",
  achievement: "Logro",
  farming: "Farmeo",
  profession: "Profesión",
  delves: "Profundidades",
  reputation: "Reputación",
  guild_bank: "Banco de hermandad",
};
