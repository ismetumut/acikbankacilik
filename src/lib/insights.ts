/** Gelir doğrulama & harcanabilirlik analizi — banka hareketlerinden hesaplanır. */
import type { CashFlowPoint, IncomeInsight, Transaction } from "./types";

export function computeIncomeInsights(txns: Transaction[], cashFlow: CashFlowPoint[] = []): IncomeInsight {
  const empty: IncomeInsight = {
    monthlyAverageIncome: 0,
    monthlyAverageExpense: 0,
    recurringIncomeSources: [],
    affordabilityScore: 0,
    disposableMonthly: 0,
    incomeStabilityLabel: "Yetersiz veri",
    monthsAnalyzed: 0,
  };
  if ((!txns || txns.length === 0) && cashFlow.length === 0) return empty;

  // Aylık toplamlar temsili nakit akışı serisinden (dengeli); yoksa hareketlerden.
  let monthlyIn: number;
  let monthlyOut: number;
  let months: number;
  if (cashFlow.length > 0) {
    months = Math.max(1, Math.round(cashFlow.length / 30));
    monthlyIn = Math.round(cashFlow.reduce((s, p) => s + p.incoming, 0) / months);
    monthlyOut = Math.round(cashFlow.reduce((s, p) => s + p.outgoing, 0) / months);
  } else {
    const times = txns.map((t) => new Date(t.date).getTime());
    const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
    months = Math.max(1, Math.round(spanDays / 30));
    monthlyIn = Math.round(txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0) / months);
    monthlyOut = Math.round(txns.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0) / months);
  }

  const incoming = txns.filter((t) => t.amount > 0);

  // Tekrar eden gelir kaynakları: aynı karşı taraftan ≥2 tahsilat.
  const byCp = new Map<string, { amount: number; count: number }>();
  for (const t of incoming) {
    const e = byCp.get(t.counterparty) ?? { amount: 0, count: 0 };
    e.amount += t.amount;
    e.count += 1;
    byCp.set(t.counterparty, e);
  }
  const recurring = [...byCp.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([source, v]) => ({ source, amount: Math.round(v.amount / v.count), count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const disposable = monthlyIn - monthlyOut;
  const ratio = monthlyIn > 0 ? disposable / monthlyIn : 0;
  const affordability = Math.max(0, Math.min(100, Math.round(ratio * 100 + recurring.length * 5)));
  const stability: IncomeInsight["incomeStabilityLabel"] =
    recurring.length >= 2 ? "Düzenli" : incoming.length >= 3 ? "Değişken" : "Yetersiz veri";

  return {
    monthlyAverageIncome: monthlyIn,
    monthlyAverageExpense: monthlyOut,
    recurringIncomeSources: recurring,
    affordabilityScore: affordability,
    disposableMonthly: disposable,
    incomeStabilityLabel: stability,
    monthsAnalyzed: months,
  };
}
