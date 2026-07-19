import { useState } from "react";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { LoadingRows, Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { TOTAL_BALANCE } from "@/lib/mockData";

const HORIZONS = [30, 60, 90] as const;

export function CashFlow() {
  const banking = useBanking();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(30);
  const { data: forecast } = useAsync(() => banking.getCashFlowForecast(horizon), [horizon]);
  const { data: expected } = useAsync(() => banking.getExpectedCashItems(), []);

  const today = new Date("2026-07-17T00:00:00+03:00");
  const lowestPoint = forecast?.filter((p) => p.forecast !== undefined).sort((a, b) => (a.forecast ?? 0) - (b.forecast ?? 0))[0];
  const endPoint = forecast?.at(-1);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  horizon === h ? "bg-ink-900 text-white" : "bg-cream-100 text-ink-900/60"
                }`}
              >
                {h} gün
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">Son 18 aylık hareketten öğrenildi · güven aralığı %80</span>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bugün</p>
              <p className="font-display mt-1 text-2xl font-extrabold tabular text-ink-900">
                {formatCurrency(TOTAL_BALANCE, { withDecimals: false })}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {endPoint ? formatDate(endPoint.date) : "…"} tahmini
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold tabular text-brand-500">
                {endPoint?.forecast ? formatCurrency(endPoint.forecast, { withDecimals: false }) : "…"}
              </p>
            </div>
          </div>
          {lowestPoint?.forecast && (
            <div className="max-w-sm rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-700">
              ⚠ {formatDate(lowestPoint.date)} civarı bakiye {formatCurrency(lowestPoint.forecast, { withDecimals: false })}'e
              kadar inebilir — KDV + maaş ödemeleri çakışıyor.
            </div>
          )}
        </div>

        <div className="mt-6 h-72">
          {forecast ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecast} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14372c" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#14372c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDateTime(v).split(" ").slice(0, 2).join(" ")}
                  ticks={[forecast[0].date, forecast[Math.floor(forecast.length / 2)].date, forecast.at(-1)!.date]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#7a7568" }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), { withDecimals: false })}
                  labelFormatter={(v) => formatDateTime(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e4e0d4", fontSize: 12 }}
                />
                <Area dataKey="bandHigh" stroke="none" fill="url(#bandFill)" />
                <Area dataKey="bandLow" stroke="none" fill="#f4f2ec" />
                <Line type="monotone" dataKey="actual" stroke="#14372c" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke="#1f7a5c" strokeWidth={2.5} strokeDasharray="6 5" dot={false} />
                <ReferenceLine x={today.toISOString()} stroke="#c9c3b3" strokeDasharray="3 3" label={{ value: "bugün", position: "insideTopLeft", fontSize: 11, fill: "#7a7568" }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-3 text-brand-500">Beklenen girişler</CardTitle>
          {!expected ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="divide-y divide-line">
              {expected.incoming.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-ink-900">{item.label}</p>
                    <p className="text-xs text-muted">{item.subLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular text-brand-500">+{formatCurrency(item.amount, { withDecimals: false })}</p>
                    <p className="text-xs text-muted">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardTitle className="mb-3 text-negative-700">Beklenen çıkışlar</CardTitle>
          {!expected ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="divide-y divide-line">
              {expected.outgoing.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-ink-900">{item.label}</p>
                    <p className="text-xs text-muted">{item.subLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular text-negative-700">{formatCurrency(item.amount, { withDecimals: false })}</p>
                    <p className="text-xs text-muted">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
