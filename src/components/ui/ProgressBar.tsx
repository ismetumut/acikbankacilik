export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "brand" | "warning" | "negative";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass =
    tone === "warning" ? "bg-warning-700" : tone === "negative" ? "bg-negative-700" : "bg-brand-500";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-cream-200 ${className}`}>
      <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
