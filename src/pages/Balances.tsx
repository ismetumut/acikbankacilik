import { useMemo, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { LoadingRows, Skeleton } from "@/components/ui/Skeleton";
import { BANKS, CASH_FLOW_30D } from "@/lib/mockData";
import { formatRelative } from "@/lib/format";

const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;
const RATES = { USD: "41,08 / 41,19", EUR: "44,63 / 44,77", GBP: "52,10 / 52,31" };
const DONUT_COLORS = ["#B4231E", "#1B2A63", "#0C6B41", "#1E3A6E"];

export function Balances() {
  const banking = useBanking();
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("TRY");
  const { data: accounts, loading } = useAsync(() => banking.getAccounts(), []);

  const tryAccounts = accounts?.filter((a) => a.currency === "TRY") ?? [];
  const nakit = tryAccounts.filter((a) => a.kind !== "ekhesap").reduce((s, a) => s + a.balance, 0);
  const ekHesap = tryAccounts.filter((a) => a.overdraftLimit).reduce((s, a) => s - a.overdraftLimit!, 0);
  const net = nakit + ekHesap;

  const distribution = useMemo(() => {
    if (!accounts) return [];
    const byBank = new Map<string, number>();
    tryAccounts.forEach((a) => byBank.set(a.bankId, (byBank.get(a.bankId) ?? 0) + a.balance));
    const total = Array.from(byBank.values()).reduce((s, v) => s + v, 0);
    return BANKS.map((b) => ({
      bankId: b.id,
      name: b.shortName,
      value: byBank.get(b.id) ?? 0,
      pct: Math.round(((byBank.get(b.id) ?? 0) / total) * 100),
    })).filter((d) => d.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const monthly = useMemo(() => {
    const months = ["Ağu", "Kas", "Şub", "May", "Tem"];
    return months.map((m, i) => ({
      month: m,
      gelen: 60000 + i * 8000 + Math.sin(i) * 5000,
      giden: 45000 + i * 6000 + Math.cos(i) * 4000,
    }));
  }, []);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                currency === c ? "bg-ink-900 text-white" : "bg-cream-100 text-ink-900/60"
              }`}
            >
              {c}
            </button>
          ))}
          <span className="ml-2 text-xs text-muted">
            Tüm döviz cinslerindeki bakiyeler seçili kura çevrilerek toplam gösterilir
          </span>
        </div>
        <div className="flex gap-5 text-xs">
          {(Object.keys(RATES) as (keyof typeof RATES)[]).map((k) => (
            <span key={k}>
              <span className="font-bold text-ink-900">{k}</span>{" "}
              <span className="text-muted">{RATES[k]}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nakit varlıklar (kümülatif)</p>
          <Money value={nakit} signed size="lg" colorize className="mt-2" />
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kredili mevduat / ek hesap</p>
          <Money value={ekHesap} signed size="lg" colorize className="mt-2" />
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Net varlık (kümülatif)</p>
          <Money value={net} signed size="lg" colorize className="mt-2" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Banka bazlı dağılım</CardTitle>
          <div className="flex items-center gap-6">
            <div className="relative h-40 w-40 shrink-0">
              {distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2}>
                      {distribution.map((d, i) => (
                        <Cell key={d.bankId} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₺${Number(v).toLocaleString("tr-TR")}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full rounded-full" />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted">{accounts?.length ?? "…"} hesap</span>
                <span className="font-display text-lg font-extrabold text-ink-900">{BANKS.length} banka</span>
              </div>
            </div>
            <div className="space-y-2">
              {distribution.map((d, i) => (
                <div key={d.bankId} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="w-24 text-ink-900/80">{d.name}</span>
                  <span className="font-bold text-ink-900">%{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Aylık gelen / giden toplamı</CardTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <Tooltip formatter={(v) => `₺${Math.round(Number(v)).toLocaleString("tr-TR")}`} />
                <Line type="monotone" dataKey="gelen" stroke="#1f7a5c" strokeWidth={2} dot={false} name="Gelen" />
                <Line type="monotone" dataKey="giden" stroke="#9a3324" strokeWidth={2} dot={false} name="Giden" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            {monthly.map((m) => (
              <span key={m.month}>{m.month}</span>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        {loading || !accounts ? (
          <LoadingRows rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3">Hesap</th>
                  <th className="pb-2 pr-3">IBAN</th>
                  <th className="pb-2 pr-3">Döviz</th>
                  <th className="pb-2 pr-3 text-right">Bakiye</th>
                  <th className="pb-2 pr-3 text-right">Kullanılabilir</th>
                  <th className="pb-2">Son senkron</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {CASH_FLOW_30D.length >= 0 &&
                  accounts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <BankAvatar bankId={a.bankId} size="sm" />
                          <div>
                            <p className="font-semibold text-ink-900">{a.label}</p>
                            <p className="text-xs text-muted">{a.subLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap font-mono text-xs text-muted">{a.iban}</td>
                      <td className="py-3 pr-3 text-xs font-semibold text-ink-900/70">{a.currency}</td>
                      <td className="py-3 pr-3 text-right">
                        <Money value={a.balance} signed colorize size="sm" />
                      </td>
                      <td className="py-3 pr-3 text-right text-xs tabular text-muted">
                        {a.overdraftLimit ? "₺" + a.availableBalance.toLocaleString("tr-TR") + " (limit dahil)" : "₺" + a.availableBalance.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-3 text-xs text-muted">{formatRelative(a.lastSync)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
