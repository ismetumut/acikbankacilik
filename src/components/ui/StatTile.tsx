import type { ReactNode } from "react";
import { Card } from "./Card";

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "negative" | "positive";
}) {
  const valueColor =
    tone === "negative" ? "text-negative-700" : tone === "positive" ? "text-brand-500" : "text-ink-900";
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display mt-2 text-2xl font-extrabold tabular ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
