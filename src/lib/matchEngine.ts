/**
 * Kural tabanlı ERP eşleştirme motoru.
 *
 * Bir banka hareketini (gelen/giden) açık ERP faturaları + cari listesiyle karşılaştırır,
 * ağırlıklı sinyallerle 0-100 güven skoru ve "neden eşleşti" gerekçeleri üretir.
 * Saf ve yan etkisiz — hem frontend hem backend/testler tarafından kullanılabilir;
 * ileride LLM katmanı bu skorların üstüne "zor vaka" çözümleyici olarak eklenebilir.
 */
import type {
  ErpCari,
  ErpInvoice,
  ErpMapping,
  MatchBand,
  MatchCandidate,
  MatchInput,
  MatchReason,
} from "./types";

export interface ErpData {
  cariList: ErpCari[];
  invoices: ErpInvoice[];
  mappings?: ErpMapping[];
}

/* ------------------------------------------------------------------ yardımcılar */

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };

/** Türkçe karakterleri sadeleştirip küçük harfe indirger. */
export function normalize(s: string): string {
  return (s || "")
    .replace(/[çğıöşüİ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Şirket türü ekleri gibi ayırt edici olmayan kelimeler benzerlikte sayılmaz. */
const STOPWORDS = new Set([
  "san", "tic", "ltd", "sti", "as", "a", "s", "ve", "co", "sirketi", "sanayi", "ticaret",
  "limited", "anonim", "odeme", "havale", "fast", "eft", "fatura", "the",
]);

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** İki metnin ayırt edici kelimeleri üzerinden Jaccard benzerliği (0-1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/** Açıklamadan fatura no / referans adayı token'ları çıkarır (ör. 1184, A-1547, 2026-7). */
export function extractRefs(text: string): string[] {
  const refs = new Set<string>();
  const raw = text || "";
  // FTR-2026-1184 → son sayı bloğu ve tam kod
  for (const m of raw.matchAll(/[A-Za-z]{0,4}[-/ ]?\d{2,4}[-/ ]?\d{2,6}/g)) refs.add(m[0]);
  for (const m of raw.matchAll(/\b\d{3,6}\b/g)) refs.add(m[0]);
  for (const m of raw.matchAll(/\b[A-Za-z]{1,3}[-/]?\d{3,6}\b/g)) refs.add(m[0]);
  return [...refs].map((r) => r.trim()).filter(Boolean);
}

const isYear = (s: string) => /^(19|20)\d{2}$/.test(s);

/** docNo bu açıklamada geçiyor mu? Yıl bloğu (ör. 2026) hariç, ayırt edici sıra no bazlı. */
function refMatches(docNo: string, description: string): boolean {
  const descDigits = new Set((description.match(/\d{3,6}/g) ?? []).filter((n) => !isYear(n)));
  const docNums = (docNo.match(/\d{3,6}/g) ?? []).filter((n) => !isYear(n));
  return docNums.length > 0 && docNums.some((n) => descDigits.has(n));
}

function money(n: number): string {
  return "₺" + Math.round(n).toLocaleString("tr-TR");
}

function bandOf(score: number): MatchBand {
  if (score >= 85) return "auto";
  if (score >= 55) return "review";
  return "manual";
}

/** Karşı taraf için öğrenme sözlüğü anahtarı (IBAN öncelikli, yoksa normalize isim). */
export function mappingKey(input: { iban?: string; counterparty: string }): string {
  if (input.iban) return "iban:" + input.iban.replace(/\s/g, "").toUpperCase();
  return "name:" + normalize(input.counterparty);
}

/* ------------------------------------------------------------------ skorlama */

const W = { iban: 34, learned: 32, reference: 34, amountExact: 28, name: 24, date: 8 };
const AMOUNT_TOLERANCE = (amt: number) => Math.max(50, Math.abs(amt) * 0.005); // ≥₺50 veya %0.5

interface Scored {
  score: number;
  reasons: MatchReason[];
  amountOk: boolean;
  amountExact: boolean;
}

/** Karşı taraf adı ile cari adı benzerliği — açıklama gürültüsünden etkilenmemek için ikisinin en iyisi. */
function cariSimilarity(input: MatchInput, cari: ErpCari | undefined): number {
  if (!cari) return 0;
  return Math.max(nameSimilarity(input.counterparty, cari.name), nameSimilarity(input.description, cari.name));
}

/** Tek bir fatura için hareketle uyum skoru ve gerekçeleri. */
function scoreInvoice(
  input: MatchInput,
  inv: ErpInvoice,
  cari: ErpCari | undefined,
  ctx: { ibanCariId?: string; learnedCariId?: string },
): Scored {
  const reasons: MatchReason[] = [];
  let score = 0;
  const absAmount = Math.abs(input.amount);

  // IBAN → cari
  if (ctx.ibanCariId && inv.cariId === ctx.ibanCariId) {
    score += W.iban;
    reasons.push({ signal: "iban", label: `Gönderen IBAN cari kartıyla eşleşti (${cari?.name ?? inv.cariId})`, positive: true });
  }
  // Öğrenilmiş eşleme
  if (ctx.learnedCariId && inv.cariId === ctx.learnedCariId) {
    score += W.learned;
    reasons.push({ signal: "learned", label: "Bu gönderen daha önce bu cariye bağlanmış", positive: true });
  }
  // İsim benzerliği
  const sim = cariSimilarity(input, cari);
  if (sim >= 0.34) {
    const add = Math.round(W.name * Math.min(1, sim));
    score += add;
    reasons.push({ signal: "name", label: `Ad benzerliği yüksek (${cari?.name})`, positive: true });
  }
  // Referans / fatura no
  if (refMatches(inv.docNo, input.description)) {
    score += W.reference;
    reasons.push({ signal: "reference", label: `Fatura no ${inv.docNo} açıklamada bulundu`, positive: true });
  }
  // Tutar
  const diff = Math.abs(absAmount - inv.amount);
  let amountOk = false;
  let amountExact = false;
  if (diff === 0) {
    score += W.amountExact;
    amountOk = true;
    amountExact = true;
    reasons.push({ signal: "amount", label: "Tutar faturayla birebir", positive: true });
  } else if (diff <= AMOUNT_TOLERANCE(absAmount)) {
    score += Math.round(W.amountExact * 0.7);
    amountOk = true;
    reasons.push({ signal: "amount", label: `Tutar ${money(diff)} farkla yakın`, positive: false });
  } else {
    reasons.push({ signal: "amount", label: `Tutar uyuşmuyor (${money(diff)} fark)`, positive: false });
  }
  // Vade / tarih yakınlığı
  const days = Math.abs((new Date(input.date).getTime() - new Date(inv.dueDate).getTime()) / 86_400_000);
  if (days <= 45) {
    score += Math.round(W.date * (1 - days / 45));
    reasons.push({ signal: "date", label: "Ödeme vade tarihine yakın", positive: true });
  }

  return { score: Math.min(100, score), reasons, amountOk, amountExact };
}

/** Tutar birebir değilse otomatik-eşleşmeye izin verme (finansçı farkı görmeli). */
function cappedBand(score: number, amountExact: boolean): MatchBand {
  const b = bandOf(score);
  return !amountExact && b === "auto" ? "review" : b;
}

/* ------------------------------------------------------------------ ana giriş */

/**
 * Bir banka hareketi için sıralı eşleşme adayları üretir.
 * Yön (gelen→alacak, giden→borc) tutarlı faturalar değerlendirilir; tek fatura,
 * iki-fatura kombinasyonu ve cari bakiye kapama adayları döner.
 */
export function matchTransaction(input: MatchInput, erp: ErpData): MatchCandidate[] {
  const wantDirection: ErpInvoice["direction"] = input.amount >= 0 ? "alacak" : "borc";
  const absAmount = Math.abs(input.amount);
  const pool = erp.invoices.filter((i) => i.status === "open" && i.direction === wantDirection);

  const ibanCari = input.iban
    ? erp.cariList.find((c) => c.iban.replace(/\s/g, "").toUpperCase() === input.iban!.replace(/\s/g, "").toUpperCase())
    : undefined;
  const learned = (erp.mappings ?? []).find((m) => m.key === mappingKey(input));
  const ctx = { ibanCariId: ibanCari?.id, learnedCariId: learned?.cariId };

  const cariById = new Map(erp.cariList.map((c) => [c.id, c]));
  const candidates: MatchCandidate[] = [];

  // 1) Tek fatura adayları
  for (const inv of pool) {
    const cari = cariById.get(inv.cariId);
    const s = scoreInvoice(input, inv, cari, ctx);
    if (s.score < 20) continue;
    candidates.push({
      id: `inv:${inv.id}`,
      kind: "invoice",
      label: `${inv.docNo} · ${cari?.name ?? inv.cariId}`,
      detail: `${money(inv.amount)} · vade ${new Date(inv.dueDate).toLocaleDateString("tr-TR")}`,
      amount: inv.amount,
      cariId: inv.cariId,
      invoiceIds: [inv.id],
      score: s.score,
      band: cappedBand(s.score, s.amountExact),
      reasons: s.reasons,
    });
  }

  // 2) İki fatura kombinasyonu (aynı cari, toplamı tutara eşit)
  const byCari = new Map<string, ErpInvoice[]>();
  for (const inv of pool) byCari.set(inv.cariId, [...(byCari.get(inv.cariId) ?? []), inv]);
  for (const [cariId, invs] of byCari) {
    for (let i = 0; i < invs.length; i++) {
      for (let j = i + 1; j < invs.length; j++) {
        const sum = invs[i].amount + invs[j].amount;
        const comboDiff = Math.abs(sum - absAmount);
        if (comboDiff > AMOUNT_TOLERANCE(absAmount)) continue;
        const comboExact = comboDiff === 0;
        const cari = cariById.get(cariId);
        const sim = cariSimilarity(input, cari);
        let score = W.amountExact + 10; // toplam eşleşti
        const reasons: MatchReason[] = [
          { signal: "combo", label: "İki fatura tek ödemede kapanıyor", positive: true },
          { signal: "amount", label: "Toplam tutar birebir", positive: true },
        ];
        if (ctx.ibanCariId === cariId) { score += W.iban; reasons.push({ signal: "iban", label: "IBAN cari ile eşleşti", positive: true }); }
        if (ctx.learnedCariId === cariId) { score += W.learned; reasons.push({ signal: "learned", label: "Öğrenilmiş cari eşleşmesi", positive: true }); }
        if (sim >= 0.34) { score += Math.round(W.name * Math.min(1, sim)); reasons.push({ signal: "name", label: `Ad benzerliği (${cari?.name})`, positive: true }); }
        score = Math.min(100, score) - 4; // tek faturaya göre hafif dezavantaj
        candidates.push({
          id: `combo:${invs[i].id}+${invs[j].id}`,
          kind: "combo",
          label: `${invs[i].docNo} + ${invs[j].docNo}`,
          detail: `${money(invs[i].amount)} + ${money(invs[j].amount)} · ${cari?.name ?? cariId}`,
          amount: sum,
          cariId,
          invoiceIds: [invs[i].id, invs[j].id],
          score: Math.max(0, score),
          band: cappedBand(Math.max(0, score), comboExact),
          reasons,
        });
      }
    }
  }

  // 3) Cari bakiye kapama (aynı cariye ait açık faturaların toplamı ≈ tutar)
  for (const [cariId, invs] of byCari) {
    if (invs.length < 2) continue;
    const total = invs.reduce((t, i) => t + i.amount, 0);
    if (Math.abs(total - absAmount) > AMOUNT_TOLERANCE(absAmount)) continue;
    if (candidates.some((c) => c.kind === "combo" && c.cariId === cariId)) continue;
    const cari = cariById.get(cariId);
    let score = 62;
    const reasons: MatchReason[] = [{ signal: "balance", label: "Cari açık bakiyesini kapatıyor", positive: true }];
    if (ctx.ibanCariId === cariId) { score += 15; reasons.push({ signal: "iban", label: "IBAN cari ile eşleşti", positive: true }); }
    candidates.push({
      id: `bal:${cariId}`,
      kind: "balance",
      label: `Cari hesap kapama — ${cari?.name ?? cariId}`,
      detail: `${invs.length} açık fatura · toplam ${money(total)}`,
      amount: total,
      cariId,
      invoiceIds: invs.map((i) => i.id),
      score: Math.min(100, score),
      band: bandOf(Math.min(100, score)),
      reasons,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 4);
}
