import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";
import type { BadgeTone } from "@/components/ui/Badge";
import type { PaymentLink } from "@/lib/types";

const INSTALLMENTS = ["Tek çekim", "3 taksit", "6 taksit"] as const;
const CHANNELS = ["WhatsApp", "e-posta", "SMS"] as const;

const LINK_TONE: Record<PaymentLink["status"], BadgeTone> = {
  Görüntülendi: "warning",
  Ödendi: "positive",
  Bekliyor: "neutral",
  "Süresi doldu": "negative",
};

export function Collections() {
  const banking = useBanking();
  const { data: links, refetch: refetchLinks } = useAsync(() => banking.getPaymentLinks(), []);
  const { data: overdue } = useAsync(() => banking.getOverdueReceivables(), []);

  const [customer, setCustomer] = useState("Ege Market Zinciri");
  const [amount, setAmount] = useState("96.000,00");
  const [invoiceRef, setInvoiceRef] = useState("FTR-2026-1198");
  const [installments, setInstallments] = useState<(typeof INSTALLMENTS)[number]>("Tek çekim");
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("WhatsApp");
  const [creating, setCreating] = useState(false);

  const todayCollected = 98_280;
  const openLinksTotal = links?.filter((l) => l.status !== "Ödendi").reduce((s, l) => s + l.amount, 0) ?? 0;
  const overdueTotal = overdue?.reduce((s, o) => s + o.amount, 0) ?? 0;

  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const numeric = Number(amount.replace(/\./g, "").replace(",", "."));
    await banking.createPaymentLink({ customer, amount: numeric, invoiceRef, installments, channel });
    setCreating(false);
    refetchLinks();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bugün tahsil edilen" value={formatCurrency(todayCollected, { withDecimals: false })} hint="POS ₺11.940 · link ₺44.160 · havale ₺42.180" />
        <StatTile label="Açık ödeme linki" value={links?.length ?? "…"} hint={`toplam ${formatCurrency(openLinksTotal, { withDecimals: false })}`} />
        <StatTile label="Vadesi geçen alacak" value={formatCurrency(overdueTotal, { withDecimals: false })} tone="negative" hint={`${overdue?.length ?? 0} müşteri · en eskisi 34 gün`} />
        <StatTile label="Ortalama tahsilat süresi" value="18 gün" hint="sektör ort. 41 gün" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardTitle>Ödeme linki oluştur</CardTitle>
            <p className="mb-4 text-xs text-muted">Müşterin karta veya FAST ile öder, tahsilat otomatik eşleşir</p>
            <form onSubmit={handleCreateLink} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Müşteri</span>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} className="input" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Tutar</span>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Bağlı fatura</span>
                  <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className="input" />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {INSTALLMENTS.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setInstallments(opt)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                      installments === opt ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setChannel(opt)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                      channel === opt ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="rounded-xl bg-cream-100 px-3 py-2 font-mono text-xs text-muted">
                akort.link/{customer.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 24)} · 7 gün geçerli
              </p>
              <Button type="submit" variant="primary" className="w-full" disabled={creating}>
                {creating ? "Oluşturuluyor…" : "Linki oluştur ve gönder →"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle className="mb-3">Sanal POS · gün sonu</CardTitle>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Kart tahsilatı (12 işlem)</dt>
                <dd className="font-bold text-brand-500">+₺44.160</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Komisyon (%1,89)</dt>
                <dd className="font-bold text-negative-700">−₺834</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5">
                <dt className="font-semibold text-ink-900">Yarın hesaba geçecek</dt>
                <dd className="font-bold text-ink-900">₺43.326</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aktif ödeme linkleri</CardTitle>
              <span className="text-sm font-semibold text-brand-500">Tümü →</span>
            </CardHeader>
            {!links ? (
              <LoadingRows rows={4} />
            ) : (
              <div className="divide-y divide-line">
                {links.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{l.customer}</p>
                      <p className="truncate text-xs text-muted">
                        {l.invoiceRef} · {l.channel} · {l.sentAt}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular text-ink-900">{formatCurrency(l.amount, { withDecimals: false })}</span>
                      <Badge tone={LINK_TONE[l.status]}>{l.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vadesi geçen alacaklar</CardTitle>
              <span className="text-xs text-muted">otomatik hatırlatma: vade + 3, 10, 21. gün</span>
            </CardHeader>
            {!overdue ? (
              <LoadingRows rows={4} />
            ) : (
              <div className="divide-y divide-line">
                {overdue.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-negative-100 px-2 text-xs font-bold text-negative-700">
                        {o.daysOverdue} gün
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{o.customer}</p>
                        <p className="truncate text-xs text-muted">
                          {o.invoiceRef} · vade {o.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular text-negative-700">
                        {formatCurrency(o.amount, { withDecimals: false })}
                      </span>
                      <Button size="sm" variant="secondary">
                        Link ile hatırlat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
