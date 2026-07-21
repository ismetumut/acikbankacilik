/**
 * PIS (ödeme başlatma) yardımcıları: durum yaşam döngüsü etiketleri, zaman bazlı
 * durum ilerletme simülasyonu ve Confirmation of Payee (alıcı doğrulama).
 */
import type { CopResult, ErpCari, PisStatus } from "./types";
import { nameSimilarity, normalize } from "./matchEngine";

export const PIS_STATUS_META: Record<PisStatus, { label: string; tone: "muted" | "info" | "positive" | "negative" }> = {
  created: { label: "Oluşturuldu", tone: "muted" },
  pending_cop: { label: "Alıcı doğrulanıyor", tone: "info" },
  awaiting_approval: { label: "Onay bekliyor", tone: "info" },
  submitted: { label: "Bankaya iletildi", tone: "info" },
  settling: { label: "Takasta", tone: "info" },
  completed: { label: "Tamamlandı", tone: "positive" },
  rejected: { label: "Reddedildi", tone: "negative" },
  failed: { label: "Başarısız", tone: "negative" },
};

/** Bankaya iletildikten sonra takas→tamamlanma otomatik ilerler (canlı görünsün diye zaman bazlı). */
export function simulateStatus(submittedAtIso: string, now = Date.now()): PisStatus {
  const elapsed = (now - new Date(submittedAtIso).getTime()) / 1000;
  if (elapsed < 4) return "submitted";
  if (elapsed < 12) return "settling";
  return "completed";
}

/** Eski 3 değerli özet duruma indirger (geriye dönük uyumluluk). */
export function toLegacyStatus(s: PisStatus): "Tamamlandı" | "Bankada" | "Reddedildi" {
  if (s === "completed") return "Tamamlandı";
  if (s === "rejected" || s === "failed") return "Reddedildi";
  return "Bankada";
}

const cleanIban = (s: string) => (s || "").replace(/\s/g, "").toUpperCase();

/**
 * Confirmation of Payee: verilen IBAN'ın gerçek hesap adıyla, girilen alıcı adını karşılaştırır.
 * match ≥0.82 · close_match ≥0.45 (öneri döner) · altı no_match · IBAN bilinmiyorsa unavailable.
 */
export function confirmPayee(iban: string, name: string, cariList: ErpCari[]): CopResult {
  const target = cleanIban(iban);
  if (target.length < 10) return { outcome: "unavailable", reason: "Geçersiz IBAN" };
  const account = cariList.find((c) => cleanIban(c.iban) === target);
  if (!account) {
    return { outcome: "unavailable", reason: "Bu IBAN için hesap adı doğrulaması sağlanamadı (yeni/bilinmeyen hesap)" };
  }
  const sim = nameSimilarity(name, account.name);
  const exactContained =
    normalize(account.name).includes(normalize(name)) || normalize(name).includes(normalize(account.name));
  if (sim >= 0.82 || exactContained) {
    return { outcome: "match", reason: `Alıcı adı hesap sahibiyle eşleşti (${account.name})` };
  }
  if (sim >= 0.45) {
    return { outcome: "close_match", suggestedName: account.name, reason: "Ad kısmen eşleşti — hesap sahibi farklı yazılmış olabilir" };
  }
  return { outcome: "no_match", suggestedName: account.name, reason: "Girilen ad bu IBAN'ın hesap sahibiyle eşleşmiyor" };
}
