import type { ReactNode } from "react";

export type BadgeTone = "positive" | "negative" | "warning" | "neutral" | "brand";

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive: "bg-brand-100 text-brand-600",
  negative: "bg-negative-100 text-negative-700",
  warning: "bg-warning-100 text-warning-700",
  neutral: "bg-cream-200 text-ink-900/70",
  brand: "bg-ink-900 text-white",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
