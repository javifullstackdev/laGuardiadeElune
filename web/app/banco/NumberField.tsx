"use client";

function Chevron({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 12 8" className="w-2.5 h-2.5" aria-hidden>
      <path
        d={dir === "up" ? "M1.5 6.2 L6 1.8 L10.5 6.2" : "M1.5 1.8 L6 6.2 L10.5 1.8"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  compact = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
  className?: string;
}) {
  function nudge(delta: number) {
    const current = Number(value);
    const fallback = min ?? 0;
    const base = Number.isFinite(current) ? current : fallback;
    let next = base + delta;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(String(next));
  }

  return (
    <div className={`relative ${compact ? "" : "mt-1"} ${className}`}>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 text-sm text-white focus:outline-none focus:border-yellow-500/50 ${
          compact ? "py-1.5" : "py-2"
        }`}
      />
      <div className="absolute right-1.5 inset-y-0.5 flex flex-col justify-center gap-px">
        <button
          type="button"
          aria-label="Aumentar"
          onClick={() => nudge(step)}
          className="flex-1 flex items-center justify-center w-6 rounded-sm text-yellow-400/70 hover:text-yellow-300 hover:bg-yellow-400/10"
        >
          <Chevron dir="up" />
        </button>
        <button
          type="button"
          aria-label="Reducir"
          onClick={() => nudge(-step)}
          className="flex-1 flex items-center justify-center w-6 rounded-sm text-yellow-400/70 hover:text-yellow-300 hover:bg-yellow-400/10"
        >
          <Chevron dir="down" />
        </button>
      </div>
    </div>
  );
}
