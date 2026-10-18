export default function ItemFlavor({
  craftingLabel,
  description,
}: {
  craftingLabel?: string | null;
  description?: string | null;
}) {
  if (!craftingLabel && !description) return null;
  return (
    <div className="mt-0.5 space-y-0.5">
      {craftingLabel && <p className="text-[11px] text-yellow-200/80">{craftingLabel}</p>}
      {description && <p className="text-[11px] text-gray-400 italic leading-snug">“{description}”</p>}
    </div>
  );
}
