import { gradeLabel, type MaterialGrade } from "@/lib/bank";

const GEM: Record<
  Exclude<MaterialGrade, "none">,
  { rim: string; fill: string; shine: string; core: string }
> = {
  bronze: { rim: "#f0d48a", fill: "#b56a28", shine: "#f4c989", core: "#7a3d12" },
  silver: { rim: "#f3f6fb", fill: "#b7c2d0", shine: "#ffffff", core: "#6d7888" },
  gold: { rim: "#ffe9a0", fill: "#e0b33a", shine: "#fff4c2", core: "#8a6a10" },
};

export default function QualityGem({
  grade,
  size = 28,
}: {
  grade: Exclude<MaterialGrade, "none">;
  size?: number;
}) {
  const { rim, fill, shine, core } = GEM[grade];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="shrink-0 drop-shadow-sm">
      <polygon points="32,3 58,17 58,47 32,61 6,47 6,17" fill={rim} />
      <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill={fill} />
      <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill={core} opacity="0.45" />
      <polygon points="22,18 32,12 36,20 26,26" fill={shine} opacity="0.7" />
    </svg>
  );
}

export function GradeBadge({ grade }: { grade: string | null | undefined }) {
  if (!grade || grade === "none") return null;
  if (grade !== "bronze" && grade !== "silver" && grade !== "gold") return null;
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <QualityGem grade={grade} size={16} />
      <span>{gradeLabel(grade)}</span>
    </span>
  );
}
