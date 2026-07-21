import { useEffect, useMemo, useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { bankOf } from "@/lib/mockData";
import { matchTransaction, mappingKey, type ErpData } from "@/lib/matchEngine";
import type { MatchBand, MatchCandidate, ReconciliationException } from "@/lib/types";

const BAND_META: Record<MatchBand, { label: string; cls: string }> = {
  auto: { label: "Otomatik eşleşir", cls: "bg-brand-500 text-white" },
  review: { label: "Öneri · onayla", cls: "bg-warning-100 text-warning-700" },
  manual: { label: "Manuel", cls: "bg-cream-200 text-muted" },
};

function toInput(e: ReconciliationException) {
  return { counterparty: e.customer, description: e.description, amount: e.amount, date: e.date, iban: e.counterpartyIban };
}

export function Reconciliation() {
  const banking = useBanking();
  const { data: exceptions, loading, refetch } = useAsync(() => banking.getReconciliationExceptions(), []);
  const { data: cariList } = useAsync(() => banking.getErpCariList(), []);
  const { data: invoices } = useAsync(() => banking.getErpInvoices(), []);
  const { data: mappings, refetch: refetchMappings } = useAsync(() => banking.getErpMappings(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  const erp: ErpData | null = cariList && invoices ? { cariList, invoices, mappings: mappings ?? [] } : null;

  // Motoru her istisna için çalıştır (öğrenilmiş eşlemeler de dahil).
  const resultsByException = useMemo(() => {
    const map = new Map<string, MatchCandidate[]>();
    if (!exceptions || !erp) return map;
    for (const e of exceptions) map.set(e.id, matchTransaction(toInput(e), erp));
    return map;
  }, [exceptions, erp]);

  useEffect(() => {
    if (exceptions && exceptions.length > 0 && !exceptions.find((e) => e.id === selectedId)) {
      setSelectedId(exceptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceptions]);

  const selected = exceptions?.find((e) => e.id === selectedId);
  const candidates = selected ? resultsByException.get(selected.id) ?? [] : [];
  const topCandidate = candidates[0];

  // Gerçek istatistik: motor kaç istisnayı otomatik / öneriyle çözebiliyor.
  const tops = [...resultsByException.values()].map((c) => c[0]);
  const autoCount = tops.filter((c) => c?.band === "auto").length;
  const reviewCount = tops.filter((c) => c?.band === "review").length;
  const total = exceptions?.length ?? 0;
  const coverage = total > 0 ? Math.round(((autoCount + reviewCount) / total) * 100) : 0;

  async function handleMatch() {
    if (!selected || !topCandidate) return;
    setMatching(true);
    await banking.matchReconciliation(selected.id, topCandidate.id);
    // Öğrenme döngüsü: bu karşı taraf → cari eşlemesini kalıcılaştır.
    if (topCandidate.cariId) await banking.saveErpMapping(mappingKey(toInput(selected)), topCandidate.cariId);
    setMatching(false);
    await refetchMappings();
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Motor otomatik çözer" value={`${autoCount} / ${total}`} tone="positive" hint="≥%85 güven · dokunmadan" />
        <StatTile label="Tek tık öneri" value={reviewCount} hint="motor aday buldu, onayınızı bekliyor" />
        <StatTile label="Kapsam" value={`%${coverage}`} hint="istisnaların motorla çözülebilen oranı" />
        <StatTile label="e-Fatura çapraz kontrol" value="Sorunsuz" tone="positive" hint="son kontrol 09:12" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardTitle className="mb-1">İstisnalar</CardTitle>
          <p className="mb-4 text-xs text-muted">— sadece bunlara bakmanız yeterli</p>
          {loading ? (
            <LoadingRows rows={5} />
          ) : exceptions?.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Tüm hareketler eşleşti 🎉</p>
          ) : (
            <div className="space-y-1">
              {exceptions?.map((e) => {
                const band = resultsByException.get(e.id)?.[0]?.band ?? "manual";
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                      e.id === selectedId ? "bg-cream-200" : "hover:bg-cream-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink-900">{e.customer}</span>
                      <span className={`shrink-0 text-sm font-bold tabular ${e.amount < 0 ? "text-negative-700" : "text-ink-900"}`}>
                        {formatCurrency(e.amount, { withDecimals: false })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${BAND_META[band].cls}`}>
                        {BAND_META[band].label}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{formatDate(e.date)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          {!selected ? (
            <p className="py-16 text-center text-sm text-muted">Soldan bir istisna seçin.</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Banka hareketi · {bankOf(selected.bankId).shortName.toUpperCase()} ····{selected.accountTail}
              </p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold text-ink-900">{selected.customer}</h3>
                <span className={`font-display text-xl font-extrabold tabular ${selected.amount < 0 ? "text-negative-700" : "text-brand-500"}`}>
                  {formatCurrency(selected.amount, { withDecimals: true })}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatDate(selected.date)} · {selected.description}
                {selected.counterpartyIban && <> · <span className="tabular">{selected.counterpartyIban}</span></>}
              </p>

              <div className="mt-5 rounded-xl border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-ink-900 text-[10px] font-extrabold text-white">
                      AI
                    </span>
                    {candidates.length > 0 ? "ERP karşılığı — güvene göre sıralı" : "Aday bulunamadı"}
                  </p>
                  {topCandidate && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BAND_META[topCandidate.band].cls}`}>
                      {BAND_META[topCandidate.band].label}
                    </span>
                  )}
                </div>

                {candidates.length === 0 ? (
                  <p className="rounded-lg bg-cream-100 p-3 text-xs text-muted">
                    Motor eşleşen açık fatura/cari bulamadı (ör. şahıs havalesi ya da faturasız iade). Elle arayıp
                    onayladığınızda motor bu karşı tarafı öğrenir.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {candidates.map((c, i) => (
                      <div
                        key={c.id}
                        className={`rounded-lg border p-3 ${i === 0 ? "border-brand-500 bg-brand-50" : "border-line"}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink-900">{c.label}</p>
                            <p className="truncate text-xs text-muted">{c.detail}</p>
                          </div>
                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            <div className="w-20">
                              <div className="mb-1 flex justify-between text-[10px] text-muted">
                                <span>güven</span>
                                <span className="font-bold text-ink-900">%{c.score}</span>
                              </div>
                              <ProgressBar value={c.score} />
                            </div>
                            <span className="text-sm font-bold tabular text-ink-900">
                              {formatCurrency(c.amount, { withDecimals: false })}
                            </span>
                          </div>
                        </div>
                        {/* Neden bu eşleşme — açıklanabilirlik (denetim güveni) */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {c.reasons.map((r, ri) => (
                            <span
                              key={ri}
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                r.positive ? "bg-brand-100 text-brand-600" : "bg-negative-100 text-negative-700"
                              }`}
                            >
                              {r.positive ? "✓" : "!"} {r.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" disabled={!topCandidate || matching} onClick={handleMatch} className="flex-1">
                  {matching
                    ? "Eşleştiriliyor…"
                    : topCandidate
                      ? `✓ ${topCandidate.label.split(" · ")[0]} ile eşleştir`
                      : "Aday yok"}
                </Button>
                <Button variant="secondary">Elle ara</Button>
                <Button variant="secondary">Kural oluştur</Button>
              </div>

              <p className="mt-4 rounded-xl bg-cream-100 p-3 text-xs text-muted">
                Eşleştirince ERP'de (Logo Tiger) cari hesaba otomatik işlenir ve motor bu karşı tarafı öğrenir —
                sonraki aynı gönderen tek tıkla, giderek daha yüksek güvenle eşleşir.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
