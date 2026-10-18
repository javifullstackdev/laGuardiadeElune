export type BankItem = {
  id: string;
  blizzard_item_id: number;
  name: string;
  quality: string | null;
  icon_url: string | null;
  points: number;
  pending_deposits: number;
  pending_withdrawals: number;
};

export type BankHit = {
  id: number;
  name: string;
  quality: string | null;
  icon_url: string | null;
  points: number | null;
  in_catalog: boolean;
};

export type BankRequest = {
  id: string;
  kind: "deposit" | "withdrawal";
  status: "pending" | "approved" | "rejected" | "completed";
  blizzard_item_id: number;
  item_name: string;
  item_quality: string | null;
  item_icon_url: string | null;
  quantity: number;
  note: string | null;
  character_name: string | null;
  character_realm: string | null;
  estimated_points: number | null;
  current_points: number | null;
  awarded_points: number | null;
  admin_note: string | null;
  username: string;
  path: string | null;
  scores_points: boolean;
  created_at: string | null;
  resolved_at: string | null;
};

export const KIND_LABEL = {
  deposit: "Ingreso",
  withdrawal: "Retirada",
};

export const STATUS_LABEL = {
  pending: "Pendiente",
  approved: "Aceptado",
  rejected: "Rechazado",
  completed: "Entregado",
};

export const QUALITY_CLASS: Record<string, string> = {
  poor: "text-[#9d9d9d]",
  common: "text-gray-100",
  uncommon: "text-[#1eff00]",
  rare: "text-[#0070dd]",
  epic: "text-[#a335ee]",
  legendary: "text-[#ff8000]",
  artifact: "text-[#e6cc80]",
  heirloom: "text-[#00ccff]",
};

export function qualityClass(quality: string | null | undefined): string {
  return QUALITY_CLASS[(quality || "").toLowerCase()] || "text-gray-200";
}

export function apiDetail(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object" && "msg" in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg);
    }
  }
  return fallback;
}
