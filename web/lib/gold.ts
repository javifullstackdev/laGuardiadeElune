export type GoldDeposit = {
  id: string;
  character_name: string;
  character_realm: string;
  copper: number;
  status: "pending" | "approved" | "rejected";
  estimated_points: number;
  current_points: number | null;
  awarded_points: number | null;
  note: string | null;
  admin_note: string | null;
  username: string;
  created_at: string | null;
  resolved_at: string | null;
};

export type GoldBoard = {
  silver_per_point: number;
  goal_copper: number;
  confirmed_copper: number;
  pending_copper: number;
  deposits: GoldDeposit[];
};

export const COPPER_PER_SILVER = 100;
export const COPPER_PER_GOLD = 10_000;

export const EMPTY_GOLD_BOARD: GoldBoard = {
  silver_per_point: 10,
  goal_copper: 100 * COPPER_PER_GOLD,
  confirmed_copper: 0,
  pending_copper: 0,
  deposits: [],
};

export function pointsForCopper(copper: number, silverPerPoint: number) {
  if (silverPerPoint < 1 || copper < 1) return 0;
  return Math.floor(copper / (silverPerPoint * COPPER_PER_SILVER));
}

export function formatMoney(copper: number) {
  const safe = Math.max(0, Math.floor(copper));
  const gold = Math.floor(safe / COPPER_PER_GOLD);
  const silver = Math.floor((safe % COPPER_PER_GOLD) / COPPER_PER_SILVER);
  const coins = safe % COPPER_PER_SILVER;
  const parts: string[] = [];
  if (gold) parts.push(`${gold} de oro`);
  if (silver) parts.push(`${silver} de plata`);
  if (coins || parts.length === 0) parts.push(`${coins} de cobre`);
  return parts.join(", ");
}

export const GOLD_STATUS: Record<GoldDeposit["status"], string> = {
  pending: "Pendiente de confirmar",
  approved: "Confirmado",
  rejected: "No confirmado",
};
