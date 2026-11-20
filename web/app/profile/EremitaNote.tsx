export default function EremitaNote({
  tone,
  title,
  reason,
  next,
}: {
  tone: "amber" | "red";
  title: string;
  reason?: string | null;
  next: string;
}) {
  const box =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return (
    <div className={`rounded-lg border px-3 py-2 space-y-1 ${box}`}>
      <p className="text-sm font-medium">{title}</p>
      {reason ? <p className="text-sm whitespace-pre-wrap">{reason}</p> : null}
      <p className="text-xs opacity-80">{next}</p>
    </div>
  );
}
