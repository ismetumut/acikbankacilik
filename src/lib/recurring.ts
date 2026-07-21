/** Otomatik ödeme talimatı yardımcıları — tür etiketleri ve sonraki çalışma tarihi. */
import type { RecurringFrequency, RecurringKind } from "./types";

export const RECURRING_KIND_META: Record<RecurringKind, { label: string; desc: string; icon: string }> = {
  scheduled: { label: "Planlı ödeme", desc: "İleri tarihli, tek seferlik ödeme", icon: "📅" },
  standing_order: { label: "Otomatik talimat", desc: "Sabit tutar, düzenli tekrar (standing order)", icon: "🔁" },
  vrp: { label: "VRP", desc: "Değişken tutarlı tekrarlı ödeme yetkisi", icon: "⚡" },
  sweep: { label: "Sweep", desc: "Hesaplar arası otomatik bakiye aktarımı", icon: "💧" },
};

export const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  once: "Tek sefer",
  weekly: "Haftalık",
  monthly: "Aylık",
};

/** Sonraki çalışma tarihini frekansa göre ilerletir. */
export function nextRunDate(iso: string, freq: RecurringFrequency): string {
  const d = new Date(iso);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
