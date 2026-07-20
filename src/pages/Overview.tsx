import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useBanking } from "@/banking/context";
import { useCompany, isConsolidated } from "@/company/context";
import { useAsync } from "@/lib/useAsync";
import { useOverviewWidgets, OVERVIEW_WIDGETS } from "@/lib/useOverviewWidgets";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { LoadingRows, Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate, formatDateTime, formatRelative, formatSignedCurrency } from "@/lib/format";
import { ANOMALY, CURRENCY_SYMBOLS, DEMO_NOW, bankOf, companyOf, convertToTRY, totalBalanceFor } from "@/lib/mockData";
import { useState } from "react";
import type { Account, BankId } from "@/lib/types";

export function Overview() {
  const banking = useBanking();
  const { companyId } = useCompany();
  const { isOn, toggle } = useOverviewWidgets();
  const { data: accounts, loading: accountsLoading } = useAsync(() => banking.getAccounts(companyId), [companyId]);
  const { data: txPage } = useAsync(
    () => banking.getTransactions({ page: 1, pageSize: 5, companyId }),
    [companyId],
  );
  const { data: cashFlow } = useAsync(() => banking.getCashFlow30d(), []);
  const { data: exceptions } = useAsync(() => banking.getReconciliationExceptions(), []);
  const { data: consents } = useAsync(() => banking.getConsents(), []);
  const { data: approvals } = useAsync(() => banking.getPendingApprovals(), []);
  const { data: overdue } = useAsync(() => banking.getOverdueReceivables(), []);
  const { data: forecast } = useAsync(() => banking.getCashFlowForecast(30), []);
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);
  const [expandedBank, setExpandedBank] = useState<BankId | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const scopeLabel = isConsolidated(companyId) ? "Tüm grup" : (companyOf(companyId)?.shortName ?? "");

  const warningConsents = consents?.filter((c) => c.status === "expiring" || c.status === "expired") ?? [];
  const expiringConsent = warningConsents[0];
  const expiringDaysLeft = expiringConsent
    ? Math.max(0, Math.round((new Date(expiringConsent.expiresAt).getTime() - DEMO_NOW.getTime()) / 86_400_000))
    : 0;

  const totalBalance = accounts ? totalBalanceFor(accounts) : 0;

  const byBank = new Map<string, { balance: number; count: number; lastSync: string }>();
  const accountsByBank = new Map<string, Account[]>();
  accounts?.forEach((a) => {
    const entry = byBank.get(a.bankId) ?? { balance: 0, count: 0, lastSync: a.lastSync };
    entry.balance += convertToTRY(a.balance, a.currency);
    entry.count += 1;
    if (new Date(a.lastSync) > new Date(entry.lastSync)) entry.lastSync = a.lastSync;
    byBank.set(a.bankId, entry);
    accountsByBank.set(a.bankId, [...(accountsByBank.get(a.bankId) ?? []), a]);
  });

  const totalIncoming = cashFlow?.reduce((s, p) => s + p.incoming, 0) ?? 0;
  const totalOutgoing = cashFlow?.reduce((s, p) => s + p.outgoing, 0) ?? 0;
  const todayIncoming = cashFlow?.at(-1)?.incoming ?? 0;
  const todayOutgoing = cashFlow?.at(-1)?.outgoing ?? 0;
  const matchedPct = 94;

  const overdueTotal = overdue?.reduce((s, o) => s + o.amount, 0) ?? 0;
  const forecastEnd = forecast?.at(-1);
  const forecastLow = forecast
    ?.filter((p) => p.forecast !== undefined)
    .sort((a, b) => (a.forecast ?? 0) - (b.forecast ?? 0))[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative">
          <Button variant="secondary" size="sm" onClick={() => setCustomizeOpen((v) => !v)}>
            ⚙ Özelleştir
          </Button>
          {customizeOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setCustomizeOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-line bg-white p-4 shadow-lg">
                <p className="mb-1 font-display text-sm font-bold text-ink-900">Ana ekranı özelleştir</p>
                <p className="mb-3 text-xs text-muted">İstediğiniz raporları ekleyin veya kaldırın.</p>
                <div className="space-y-2.5">
                  {OVERVIEW_WIDGETS.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">{w.label}</p>
                        <p className="truncate text-xs text-muted">{w.description}</p>
                      </div>
                      <Toggle checked={isOn(w.id)} onChange={() => toggle(w.id)} label={w.label} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="bg-ink-900 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Toplam bakiye · {scopeLabel} · {accounts?.length ?? "…"} hesap
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
              <Money value={totalBalance} size="xl" className="text-white" />
              <span className="mb-1.5 flex shrink-0 items-center gap-1 rounded-full bg-brand-400/20 px-2.5 py-1 text-xs font-bold text-brand-400">
                ▲ ₺124.500 bu hafta
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:grid-cols-4">
              {accountsLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-white/10" />)}
              {Array.from(byBank.entries()).map(([bankId, info]) => {
                const isOpen = expandedBank === bankId;
                const bankAccounts = accountsByBank.get(bankId) ?? [];
                return (
                  <div key={bankId} className="rounded-xl bg-white/5">
                    <button
                      type="button"
                      onClick={() => setExpandedBank(isOpen ? null : (bankId as BankId))}
                      className="w-full p-4 text-left"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <BankAvatar bankId={bankId as BankId} size="sm" />
                          <span className="truncate text-sm font-semibold text-white/90">
                            {(accounts?.find((a) => a.bankId === bankId)?.label ?? "").split(" — ")[0]}
                          </span>
                        </div>
                        <span className={`shrink-0 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          ⌄
                        </span>
                      </div>
                      <Money value={info.balance} size="md" className="text-white" />
                      <p className="mt-1 text-[11px] text-white/50">
                        {info.count} hesap · {formatRelative(info.lastSync)}
                      </p>
                    </button>
                    {isOpen && (
                      <div className="space-y-1.5 border-t border-white/10 px-4 pb-4 pt-3">
                        {bankAccounts.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate text-white/70">{a.label.split(" — ")[1] ?? a.label}</span>
                            <span className="shrink-0 font-semibold tabular text-white">
                              {CURRENCY_SYMBOLS[a.currency]}
                              {a.balance.toLocaleString("tr-TR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {isOn("cashflow") && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Nakit akışı</CardTitle>
                  <p className="text-xs text-muted">Son 30 gün</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-brand-500">
                    <span className="h-2 w-2 rounded-full bg-brand-500" /> Gelen ₺{(totalIncoming / 1_000_000).toFixed(2)}M
                  </span>
                  <span className="flex items-center gap-1.5 text-negative-700">
                    <span className="h-2 w-2 rounded-full bg-negative-700" /> Giden ₺{(totalOutgoing / 1_000_000).toFixed(2)}M
                  </span>
                </div>
              </CardHeader>
              <div className="h-64">
                {cashFlow ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomingFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4fbf97" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4fbf97" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => formatDateTime(v).split(" ").slice(0, 2).join(" ")}
                        ticks={[cashFlow[0].date, cashFlow[Math.floor(cashFlow.length / 2)].date, cashFlow.at(-1)!.date]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#7a7568" }}
                      />
                      <Tooltip
                        formatter={(value) => formatSignedCurrency(Number(value))}
                        labelFormatter={(v) => formatDateTime(v)}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e4e0d4", fontSize: 12 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="incoming"
                        stroke="#1f7a5c"
                        strokeWidth={2}
                        fill="url(#incomingFill)"
                        name="Gelen"
                      />
                      <Area
                        type="monotone"
                        dataKey="outgoing"
                        stroke="#9a3324"
                        strokeWidth={2}
                        fill="transparent"
                        name="Giden"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="h-full w-full" />
                )}
              </div>
            </Card>
          )}

          {isOn("forecast") && (
            <Card>
              <CardHeader>
                <CardTitle>Nakit akışı tahmini</CardTitle>
                <Link to="/nakit-akisi" className="text-sm font-semibold text-brand-500 hover:underline">
                  Detay →
                </Link>
              </CardHeader>
              {!forecast ? (
                <LoadingRows rows={2} />
              ) : (
                <div className="flex flex-wrap items-start gap-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bugün</p>
                    <p className="font-display mt-1 text-xl font-extrabold tabular text-ink-900">
                      {formatCurrency(totalBalance, { withDecimals: false })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {forecastEnd ? formatDate(forecastEnd.date) : "…"} tahmini
                    </p>
                    <p className="font-display mt-1 text-xl font-extrabold tabular text-brand-500">
                      {forecastEnd?.forecast ? formatCurrency(forecastEnd.forecast, { withDecimals: false }) : "…"}
                    </p>
                  </div>
                  {forecastLow?.forecast && (
                    <p className="min-w-0 flex-1 rounded-xl bg-warning-100 px-3 py-2 text-xs text-warning-700">
                      ⚠ {formatDate(forecastLow.date)} civarı bakiye{" "}
                      {formatCurrency(forecastLow.forecast, { withDecimals: false })}'e kadar inebilir.
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          {isOn("transactions") && (
            <Card>
              <CardHeader>
                <CardTitle>Son hareketler</CardTitle>
                <Link to="/hareketler" className="text-sm font-semibold text-brand-500 hover:underline">
                  Tümü →
                </Link>
              </CardHeader>
              {!txPage ? (
                <LoadingRows rows={5} />
              ) : (
                <div className="divide-y divide-line">
                  {txPage.items.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-3">
                      <BankAvatar bankId={t.bankId} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">{t.counterparty}</p>
                        <p className="truncate text-xs text-muted">{t.description}</p>
                      </div>
                      <span className="hidden shrink-0 rounded-full bg-cream-200 px-2.5 py-1 text-[11px] font-semibold text-ink-900/70 sm:inline-block">
                        {t.category}
                      </span>
                      <span className="w-24 shrink-0 text-right text-xs text-muted">{formatDateTime(t.date)}</span>
                      <Money value={t.amount} signed size="sm" colorize className="w-28 shrink-0 text-right" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {!anomalyDismissed && (
            <Card className="border-negative-700/30 bg-negative-100/60">
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-negative-700">
                <span className="h-2 w-2 rounded-full bg-negative-700" /> Alışılmadık hareket
              </p>
              <p className="text-sm text-ink-900/80">
                {ANOMALY.counterparty}'e {ANOMALY.monthLabel}{" "}
                <span className="font-bold">{formatSignedCurrency(ANOMALY.amount).replace("+", "")}</span> ödendi — son 6
                ay ortalamasının <span className="font-bold">{ANOMALY.multiple.toString().replace(".", ",")} katı</span>.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" size="sm" onClick={() => setAnomalyDismissed(true)}>
                  İncele
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setAnomalyDismissed(true)}>
                  Normal, yoksay
                </Button>
              </div>
            </Card>
          )}

          {isOn("todaySummary") && (
            <Card>
              <CardTitle className="mb-4">Bugünkü özet</CardTitle>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Gelen</dt>
                  <dd className="font-bold text-brand-500">{formatSignedCurrency(todayIncoming)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Giden</dt>
                  <dd className="font-bold text-negative-700">{formatSignedCurrency(-todayOutgoing)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Bekleyen mutabakat</dt>
                  <dd>
                    <Link to="/mutabakat" className="font-bold text-brand-500 hover:underline">
                      {exceptions?.length ?? "…"} istisna →
                    </Link>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Otomatik eşleşen</dt>
                  <dd className="font-bold text-ink-900">%{matchedPct}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-cream-100 p-3 text-xs text-muted">
                Bu özet her sabah 08:30'da WhatsApp'a da gönderiliyor.{" "}
                <Link to="/rizalar" className="font-semibold text-ink-900 hover:underline">
                  Ayarlar
                </Link>
              </p>
            </Card>
          )}

          {isOn("approvals") && (
            <Card>
              <CardHeader>
                <CardTitle>Onay bekleyen ödemeler</CardTitle>
                <Link to="/odeme-tetikleme" className="text-sm font-semibold text-brand-500 hover:underline">
                  Tümü →
                </Link>
              </CardHeader>
              {!approvals ? (
                <LoadingRows rows={3} />
              ) : approvals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">Bekleyen onay yok.</p>
              ) : (
                <div className="divide-y divide-line">
                  {approvals.slice(0, 3).map((a) => {
                    const nextStep = a.chain.find((s) => s.status === "Bekliyor");
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{a.title}</p>
                          <p className="truncate text-xs text-muted">
                            {nextStep ? `Sırada: ${nextStep.role} · ${nextStep.person}` : "Tamamlandı"}
                          </p>
                        </div>
                        <Money value={a.amount} size="sm" className="shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {isOn("reconciliation") && (
            <Card>
              <CardHeader>
                <CardTitle>Mutabakat istisnaları</CardTitle>
                <Link to="/mutabakat" className="text-sm font-semibold text-brand-500 hover:underline">
                  Tümü →
                </Link>
              </CardHeader>
              {!exceptions ? (
                <LoadingRows rows={3} />
              ) : (
                <div className="divide-y divide-line">
                  {exceptions.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">{e.customer}</p>
                        <p className="truncate text-xs text-muted">{e.reasonHint}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular ${e.amount < 0 ? "text-negative-700" : "text-ink-900"}`}>
                        {formatCurrency(e.amount, { withDecimals: false })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {isOn("collections") && (
            <Card>
              <CardHeader>
                <CardTitle>Tahsilat özeti</CardTitle>
                <Link to="/tahsilat" className="text-sm font-semibold text-brand-500 hover:underline">
                  Tümü →
                </Link>
              </CardHeader>
              {!overdue ? (
                <LoadingRows rows={3} />
              ) : (
                <>
                  <p className="mb-3 text-sm text-ink-900/80">
                    Vadesi geçen <span className="font-bold text-negative-700">{formatCurrency(overdueTotal, { withDecimals: false })}</span>{" "}
                    · {overdue.length} müşteri
                  </p>
                  <div className="divide-y divide-line">
                    {overdue.slice(0, 2).map((o) => (
                      <div key={o.id} className="flex items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">{o.customer}</p>
                          <p className="truncate text-xs text-muted">{o.daysOverdue} gün gecikmiş</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular text-negative-700">
                          {formatCurrency(o.amount, { withDecimals: false })}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {isOn("consent") && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>Rıza durumu</CardTitle>
                <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-bold text-warning-700">
                  {warningConsents.length} uyarı
                </span>
              </div>
              <p className="mb-4 text-sm text-ink-900/80">
                {expiringConsent ? (
                  <>
                    {bankOf(expiringConsent.bankId).name} bağlantı izni{" "}
                    <span className="font-bold">{expiringDaysLeft} gün içinde</span> doluyor.
                  </>
                ) : (
                  "Tüm banka bağlantı izinleriniz aktif."
                )}
              </p>
              <Link to="/rizalar">
                <Button variant="primary" className="w-full" disabled={!expiringConsent}>
                  Tek tıkla yenile
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
