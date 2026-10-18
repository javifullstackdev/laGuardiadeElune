"use client";

import { LOT_SIZES, asLotSize, type LotSize } from "@/lib/bank";

export default function LotSelect({
  value,
  onChange,
  compact = false,
}: {
  value: LotSize;
  onChange: (lot: LotSize) => void;
  compact?: boolean;
}) {
  const select = (
    <select
      value={value}
      onChange={(e) => onChange(asLotSize(Number(e.target.value)))}
      className={
        compact
          ? "elune-select w-32 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white"
          : "elune-select mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
      }
    >
      {LOT_SIZES.map((lot) => (
        <option key={lot.id} value={lot.id}>
          {lot.label}
        </option>
      ))}
    </select>
  );
  if (compact) return select;
  return (
    <label className="block text-sm text-gray-400">
      Puntos por
      {select}
    </label>
  );
}
