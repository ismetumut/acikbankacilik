import { useEffect, useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { bankOf } from "@/lib/mockData";

export function Reconciliation() {
  const banking = useBanking();
  const { data: exceptions, loading, refetch } = useAsync(() => banking.getReconciliationExceptions(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    if (exceptions && exceptions.length > 0 && !exceptions.find((e) => e.id === selectedId)) {
      setSelectedId(exceptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exceptions]);

  const selected = exceptions?.find((e) => e.id === selectedId);
  const topCandidate = selected?.candidates[0];

  async function handleMatch() {
    if (!selected || !topCandidate) return;
    setMatching(true);
    await banking.matchReconciliation(selected.id, topCandidate.id);
    setMatching(false);
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bu ay eşleşen" value="%94" hint="642 / 683 hareket otomatik" />
        <StatTile label="Bekleyen istisna" value={exceptions?.length ?? "…"} hint="3'ü 7 günden eski" />
        <StatTile label="Elle giriş tasarrufu" value="31 saat" hint="bu ay, Logo Tiger'a aktarım dahil" />
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
              {exceptions?.map((e) => (
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
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted">{e.reasonHint}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(e.date)}</span>
                  </div>
                </button>
              ))}
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
              </p>

              <div className="mt-5 rounded-xl border border-line p-4">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-ink-900 text-[10px] font-extrabold text-white">
                    AI
                  </span>
                  {selected.candidates.length > 0 ? "En yakın 3 aday — birini seçmeniz yeterli" : "Aday bulunamadı"}
                </p>
                <div className="space-y-2">
                  {selected.candidates.map((c, i) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                        i === 0 ? "border-brand-500 bg-brand-50" : "border-line"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{c.label}</p>
                        <p className="truncate text-xs text-muted">{c.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="w-20">
                          <div className="mb-1 flex justify-between text-[10px] text-muted">
                            <span>uyum</span>
                            <span className="font-bold text-ink-900">%{c.matchScore}</span>
                          </div>
                          <ProgressBar value={c.matchScore} />
                        </div>
                        <span className="text-sm font-bold tabular text-ink-900">
                          {formatCurrency(c.amount, { withDecimals: false })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" disabled={!topCandidate || matching} onClick={handleMatch} className="flex-1">
                  {matching ? "Eşleştiriliyor…" : topCandidate ? `✓ ${topCandidate.label.split(" · ")[0]} ile eşleştir` : "Aday yok"}
                </Button>
                <Button variant="secondary">Elle ara</Button>
                <Button variant="secondary">Kural oluştur</Button>
              </div>

              <p className="mt-4 rounded-xl bg-cream-100 p-3 text-xs text-muted">
                Eşleştirince Logo Tiger'da cari hesaba otomatik işlenir; geri almak isterseniz işlem günlüğünden tek
                tıkla geri alınır.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
