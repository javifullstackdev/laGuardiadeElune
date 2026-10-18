export type MaterialGrade = "none" | "bronze" | "silver" | "gold";
export type CraftingGrade = Exclude<MaterialGrade, "none">;

export type LotSize = 1 | 10 | 100;

export type BankItem = {
  id: string;
  blizzard_item_id: number;
  name: string;
  quality: string | null;
  material_grade: MaterialGrade;
  icon_url: string | null;
  description: string | null;
  crafting_label: string | null;
  points: number;
  lot_size: LotSize;
  pending_deposits: number;
  pending_withdrawals: number;
};

export type BankHit = {
  id: number;
  name: string;
  quality: string | null;
  icon_url: string | null;
  description: string | null;
  crafting_label: string | null;
  in_catalog: boolean;
};

export type BankRequest = {
  id: string;
  kind: "deposit" | "withdrawal";
  status: "pending" | "approved" | "rejected" | "completed";
  blizzard_item_id: number;
  item_name: string;
  item_quality: string | null;
  material_grade: MaterialGrade;
  item_icon_url: string | null;
  item_description: string | null;
  crafting_label: string | null;
  quantity: number;
  note: string | null;
  character_name: string | null;
  character_realm: string | null;
  estimated_points: number | null;
  current_points: number | null;
  lot_size: LotSize;
  awarded_points: number | null;
  admin_note: string | null;
  username: string;
  path: string | null;
  scores_points: boolean;
  created_at: string | null;
  resolved_at: string | null;
};

export const CRAFTING_GRADES: { id: CraftingGrade; label: string }[] = [
  { id: "bronze", label: "Bronce" },
  { id: "silver", label: "Plata" },
  { id: "gold", label: "Oro" },
];

export const MATERIAL_GRADES: { id: MaterialGrade; label: string }[] = [
  ...CRAFTING_GRADES,
  { id: "none", label: "Sin rango" },
];

export function isCraftingGrade(grade: string | null | undefined): grade is CraftingGrade {
  return grade === "bronze" || grade === "silver" || grade === "gold";
}

export const GRADE_CLASS: Record<MaterialGrade, string> = {
  none: "text-gray-400",
  bronze: "text-[#cd7f32]",
  silver: "text-[#c0c0c0]",
  gold: "text-[#ffd700]",
};

export function gradeLabel(grade: string | null | undefined): string | null {
  return MATERIAL_GRADES.find((g) => g.id === grade)?.label ?? null;
}

export function catalogMatch(
  items: BankItem[],
  blizzardItemId: number,
  grade: MaterialGrade,
): BankItem | undefined {
  return items.find((item) => item.blizzard_item_id === blizzardItemId && item.material_grade === grade);
}

export const LOT_SIZES: { id: LotSize; label: string }[] = [
  { id: 1, label: "Unidad" },
  { id: 10, label: "Lote de 10" },
  { id: 100, label: "Lote de 100" },
];

export function asLotSize(raw: number | null | undefined): LotSize {
  return raw === 10 || raw === 100 ? raw : 1;
}

export function pointsForQuantity(points: number, quantity: number, lotSize: number = 1): number {
  const lot = asLotSize(lotSize);
  return points * Math.floor(quantity / lot);
}

export function rateLabel(points: number, lotSize: number = 1): string {
  const lot = asLotSize(lotSize);
  const unit = points === 1 ? "pt" : "pts";
  return lot === 1 ? `${points} ${unit}/ud` : `${points} ${unit} / ${lot}`;
}

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
