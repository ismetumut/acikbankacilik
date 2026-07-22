/** Uyum motoru: yaptırım/PEP taraması ve ödeme risk skorlaması (saf). */
import type { PaymentRisk, RiskLevel, SanctionsResult } from "./types";
import { normalize } from "./matchEngine";

// Demo amaçlı örnek izleme listesi (gerçek uygulamada OFAC/EU/BM/PEP beslemeleri kullanılır).
const SANCTIONS_WATCHLIST = ["ivan petrov", "global terror fund", "north star holdings", "red october ltd"];
const PEP_HINTS = ["bakan", "milletvekili", "belediye baskani", "genel mudur devlet"];

export function screenSanctions(name: string): SanctionsResult {
  const n = normalize(name);
  for (const w of SANCTIONS_WATCHLIST) {
    if (n.includes(w)) return { outcome: "hit", matchedList: "OFAC/EU", reason: `"${name}" yaptırım listesiyle eşleşti — ödeme durduruldu` };
  }
  for (const p of PEP_HINTS) {
    if (n.includes(p)) return { outcome: "review", matchedList: "PEP", reason: "Olası politik nüfuz sahibi (PEP) — ek inceleme önerilir" };
  }
  return { outcome: "clear", reason: "Yaptırım/PEP listelerinde eşleşme yok" };
}

export function computePaymentRisk(input: {
  amount: number;
  newPayee?: boolean;
  date?: string;
  sanctions?: SanctionsResult;
}): PaymentRisk {
  const reasons: string[] = [];
  let score = 0;
  if (input.amount >= 250_000) {
    score += 30;
    reasons.push("Yüksek tutar (≥₺250k)");
  } else if (input.amount >= 100_000) {
    score += 15;
    reasons.push("Orta-yüksek tutar");
  }
  if (input.newPayee) {
    score += 25;
    reasons.push("Yeni alıcı (geçmişte ödeme yok)");
  }
  const hour = input.date ? new Date(input.date).getHours() : 12;
  if (hour < 7 || hour >= 22) {
    score += 15;
    reasons.push("Mesai dışı saat");
  }
  if (input.sanctions?.outcome === "hit") {
    score += 60;
    reasons.push("Yaptırım listesi eşleşmesi");
  } else if (input.sanctions?.outcome === "review") {
    score += 25;
    reasons.push("PEP incelemesi gerekli");
  }
  score = Math.min(100, score);
  const level: RiskLevel = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  if (reasons.length === 0) reasons.push("Belirgin risk sinyali yok");
  return { score, level, reasons };
}
