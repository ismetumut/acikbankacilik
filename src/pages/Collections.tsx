import { useMemo, useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { Toggle } from "@/components/ui/Toggle";
import { QrPreview } from "@/components/ui/QrPreview";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { POS_COMMISSION, SAMPLE_CARDS, lookupBin } from "@/lib/mockData";
import type { BadgeTone } from "@/components/ui/Badge";
import type { CardPaymentResult } from "@/banking/provider";
import type { BinInfo, PaymentLink, PaymentLinkChannel } from "@/lib/types";

const LINK_TONE: Record<PaymentLink["status"], BadgeTone> = {
  Görüntülendi: "warning",
  Ödendi: "positive",
  Bekliyor: "neutral",
  "Süresi doldu": "negative",
};

const SCHEME_LABEL: Record<BinInfo["scheme"], string> = {
  Visa: "VISA",
  Mastercard: "Mastercard",
  Troy: "TROY",
};

function parseAmount(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatCardNumber(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function Collections() {
  const banking = useBanking();
  const { data: links, refetch: refetchLinks } = useAsync(() => banking.getPaymentLinks(), []);
  const { data: overdue } = useAsync(() => banking.getOverdueReceivables(), []);
  const { data: cardCollections, refetch: refetchCards } = useAsync(() => banking.getRecentCardCollections(), []);
  const { data: a2aRequests, refetch: refetchA2a } = useAsync(() => banking.getPayByBankRequests(), []);
  const { data: subscriptions, refetch: refetchSubs } = useAsync(() => banking.getSubscriptions(), []);
  const { data: settlements } = useAsync(() => banking.getSettlements(), []);

  const [tab, setTab] = useState<"moto" | "link" | "a2a">("moto");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, fn: () => Promise<void>, ...refetches: (() => void)[]) {
    setBusyId(id);
    await fn();
    setBusyId(null);
    refetches.forEach((r) => r());
  }

  const todayCollected = 98_280;
  const openLinksTotal = links?.filter((l) => l.status !== "Ödendi").reduce((s, l) => s + l.amount, 0) ?? 0;
  const overdueTotal = overdue?.reduce((s, o) => s + o.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bugün tahsil edilen" value={formatCurrency(todayCollected, { withDecimals: false })} hint="POS ₺11.940 · link ₺44.160 · havale ₺42.180" />
        <StatTile label="Açık ödeme linki" value={links?.length ?? "…"} hint={`toplam ${formatCurrency(openLinksTotal, { withDecimals: false })}`} />
        <StatTile label="Vadesi geçen alacak" value={formatCurrency(overdueTotal, { withDecimals: false })} tone="negative" hint={`${overdue?.length ?? 0} müşteri · en eskisi 34 gün`} />
        <StatTile label="Ortalama tahsilat süresi" value="18 gün" hint="sektör ort. 41 gün" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex gap-1 rounded-xl bg-cream-100 p-1">
              <button
                type="button"
                onClick={() => setTab("moto")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  tab === "moto" ? "bg-white text-ink-900 shadow-sm" : "text-ink-900/50"
                }`}
              >
                Ödeme al
              </button>
              <button
                type="button"
                onClick={() => setTab("a2a")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  tab === "a2a" ? "bg-white text-ink-900 shadow-sm" : "text-ink-900/50"
                }`}
              >
                Banka ile öde
              </button>
              <button
                type="button"
                onClick={() => setTab("link")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  tab === "link" ? "bg-white text-ink-900 shadow-sm" : "text-ink-900/50"
                }`}
              >
                Link / QR
              </button>
            </div>

            {tab === "moto" ? (
              <MotoPanel onCollected={refetchCards} />
            ) : tab === "a2a" ? (
              <PayByBankPanel onCreated={refetchA2a} />
            ) : (
              <LinkPanel onCreated={refetchLinks} />
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hakediş / settlement (T+1)</CardTitle>
              <span className="text-xs text-muted">banka ekstresiyle mutabık</span>
            </CardHeader>
            {!settlements ? (
              <LoadingRows rows={3} />
            ) : (
              <div className="divide-y divide-line">
                {settlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BankAvatar bankId={s.bankId} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {s.txnCount} işlem · brüt {formatCurrency(s.gross, { withDecimals: false })}
                        </p>
                        <p className="truncate text-xs text-muted">
                          komisyon {formatCurrency(s.commission, { withDecimals: false })} · değer tarihi {formatDate(s.valueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold tabular text-brand-500">
                        {formatCurrency(s.net, { withDecimals: false })}
                      </span>
                      {s.status === "pending" ? (
                        <Badge tone="warning">Bekliyor</Badge>
                      ) : s.bankMatched ? (
                        <Badge tone="positive">Mutabık ✓</Badge>
                      ) : (
                        <Badge tone="negative">Ekstre bekliyor</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Son kart tahsilatları</CardTitle>
              <span className="text-sm font-semibold text-brand-500">Tümü →</span>
            </CardHeader>
            {!cardCollections ? (
              <LoadingRows rows={3} />
            ) : (
              <div className="divide-y divide-line">
                {cardCollections.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-ink-900">{c.maskedCard}</p>
                      <p className="truncate text-xs text-muted">
                        {c.bank} · {c.installment > 1 ? `${c.installment} taksit` : "tek çekim"} · {c.time}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular ${c.refunded ? "text-muted line-through" : "text-brand-500"}`}>
                          +{formatCurrency(c.amount, { withDecimals: false })}
                        </p>
                        <p className="text-[11px] text-muted">net {formatCurrency(c.net, { withDecimals: false })}</p>
                      </div>
                      {c.refunded ? (
                        <Badge tone="neutral">İade edildi</Badge>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => act(c.id, () => banking.refundCardCollection(c.id), refetchCards)}
                          className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                        >
                          İade
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banka ile öde talepleri (A2A)</CardTitle>
              <span className="text-xs text-muted">komisyon ~%0,3 · anında</span>
            </CardHeader>
            {!a2aRequests ? (
              <LoadingRows rows={3} />
            ) : a2aRequests.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Henüz talep yok.</p>
            ) : (
              <div className="divide-y divide-line">
                {a2aRequests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{r.customer}</p>
                      <p className="truncate text-xs text-muted">
                        {r.invoiceRef ? `${r.invoiceRef} · ` : ""}komisyon {formatCurrency(r.fee, { withDecimals: false })} · net{" "}
                        {formatCurrency(r.net, { withDecimals: false })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular text-ink-900">
                        {formatCurrency(r.amount, { withDecimals: false })}
                      </span>
                      {r.status === "pending" ? (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, () => banking.markPayByBankPaid(r.id), refetchA2a)}
                          className="rounded-lg bg-brand-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
                        >
                          Ödendi işaretle
                        </button>
                      ) : r.status === "paid" ? (
                        <>
                          <Badge tone="positive">Ödendi</Badge>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, () => banking.refundPayByBank(r.id), refetchA2a)}
                            className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                          >
                            İade
                          </button>
                        </>
                      ) : (
                        <Badge tone={r.status === "refunded" ? "neutral" : "warning"}>
                          {r.status === "refunded" ? "İade edildi" : "Süresi doldu"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abonelikler (tekrarlı tahsilat)</CardTitle>
              <span className="text-xs text-muted">VRP mandası</span>
            </CardHeader>
            {!subscriptions ? (
              <LoadingRows rows={3} />
            ) : (
              <div className="divide-y divide-line">
                {subscriptions.map((s) => (
                  <div key={s.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{s.customer}</p>
                        <p className="truncate text-xs text-muted">
                          {s.planLabel} · {s.frequency === "monthly" ? "aylık" : "haftalık"} · {s.collectedCount} tahsilat ·{" "}
                          {s.mandateRef}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold tabular text-ink-900">
                          {formatCurrency(s.amount, { withDecimals: false })}
                        </span>
                        <Badge tone={s.status === "active" ? "positive" : s.status === "paused" ? "warning" : "neutral"}>
                          {s.status === "active" ? "Aktif" : s.status === "paused" ? "Duraklatıldı" : "İptal"}
                        </Badge>
                      </div>
                    </div>
                    {s.status !== "canceled" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => act(s.id, () => banking.chargeSubscriptionNow(s.id), refetchSubs, refetchA2a)}
                          className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                        >
                          Şimdi tahsil et
                        </button>
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() =>
                            act(s.id, () => banking.setSubscriptionStatus(s.id, s.status === "active" ? "paused" : "active"), refetchSubs)
                          }
                          className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-900 hover:bg-cream-100 disabled:opacity-50"
                        >
                          {s.status === "active" ? "Duraklat" : "Sürdür"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => act(s.id, () => banking.setSubscriptionStatus(s.id, "canceled"), refetchSubs)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-negative-700 hover:bg-negative-100 disabled:opacity-50"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

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
                        {l.invoiceRef} · {l.channel}
                        {l.reusable ? " · çok kullanımlık" : ""} · {l.sentAt}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular text-ink-900">
                        {l.amountOpen ? "açık tutar" : formatCurrency(l.amount, { withDecimals: false })}
                      </span>
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
                  <div key={o.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-negative-100 px-2 text-xs font-bold text-negative-700">
                        {o.daysOverdue} gün
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink-900">{o.customer}</p>
                        <p className="truncate text-xs text-muted">
                          {o.invoiceRef} · vade {o.dueDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-2 pl-12 sm:justify-end sm:pl-0">
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

function SchemeBadge({ bin }: { bin: BinInfo }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-cream-100 px-3 py-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-white"
        style={{ backgroundColor: bin.colorHex }}
      >
        {bin.scheme === "Visa" ? "V" : bin.scheme === "Troy" ? "T" : "MC"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">
          {bin.bank} · {bin.program}
        </p>
        <p className="text-xs text-muted">{SCHEME_LABEL[bin.scheme]} · BIN doğrulandı</p>
      </div>
    </div>
  );
}

function MotoPanel({ onCollected }: { onCollected: () => void }) {
  const banking = useBanking();
  const [customer, setCustomer] = useState("");
  const [card, setCard] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [amount, setAmount] = useState("");
  const [installment, setInstallment] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CardPaymentResult | null>(null);

  const bin = useMemo(() => lookupBin(card), [card]);
  const numericAmount = parseAmount(amount);
  const installmentOptions = [1, ...(bin?.installments ?? [])];
  const rate = installment > 1 ? POS_COMMISSION.installment : POS_COMMISSION.single;
  const commission = Math.round(numericAmount * rate);
  const net = numericAmount - commission;

  const canSubmit =
    card.replace(/\D/g, "").length === 16 && holder.trim() && expiry.length >= 4 && cvv.length >= 3 && numericAmount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await banking.takeCardPayment({
      cardNumber: card,
      holder,
      amount: numericAmount,
      installment,
      customer: customer || undefined,
    });
    setSubmitting(false);
    setResult(res);
    onCollected();
  }

  function reset() {
    setResult(null);
    setCustomer("");
    setCard("");
    setHolder("");
    setExpiry("");
    setCvv("");
    setAmount("");
    setInstallment(1);
  }

  if (result) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl text-brand-600">
          ✓
        </div>
        <p className="font-display text-lg font-extrabold text-ink-900">Ödeme alındı</p>
        <p className="mt-1 text-sm text-muted">
          {result.bank} · {result.installment > 1 ? `${result.installment} taksit` : "tek çekim"} · onay {result.reference}
        </p>
        <div className="mt-4 space-y-2 rounded-xl bg-cream-100 p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Tahsil edilen</span>
            <span className="font-bold text-ink-900">{formatCurrency(result.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Komisyon</span>
            <span className="font-bold text-negative-700">−{formatCurrency(result.commission)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <span className="font-semibold text-ink-900">Hesaba geçecek net</span>
            <span className="font-bold text-brand-500">{formatCurrency(result.net)}</span>
          </div>
        </div>
        <Button variant="primary" className="mt-4 w-full" onClick={reset}>
          Yeni ödeme al
        </Button>
      </div>
    );
  }

  return (
    <>
      <CardTitle>Ödeme al · sanal POS</CardTitle>
      <p className="mb-4 text-xs text-muted">
        Kart bilgisiyle (mail order / telefon siparişi) doğrudan tahsilat. Kart numarası girildiğinde banka ve taksit
        seçenekleri otomatik gelir.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Müşteri (opsiyonel)</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Ad / firma" className="input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Kart numarası</span>
          <input
            value={card}
            onChange={(e) => setCard(formatCardNumber(e.target.value))}
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            className="input font-mono"
          />
        </label>

        {bin ? (
          <SchemeBadge bin={bin} />
        ) : (
          <p className="text-[11px] text-muted">
            Deneyin:{" "}
            {SAMPLE_CARDS.map((c, i) => (
              <span key={c.number}>
                {i > 0 && " · "}
                <button
                  type="button"
                  onClick={() => setCard(c.number)}
                  className="font-mono text-brand-500 hover:underline"
                >
                  {c.number.slice(0, 4)}…
                </button>{" "}
                ({c.label})
              </span>
            ))}
          </p>
        )}

        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value.toUpperCase())}
          placeholder="KART ÜZERİNDEKİ İSİM"
          className="input uppercase"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            value={expiry}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 4);
              setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            }}
            placeholder="AA/YY"
            className="input"
          />
          <input
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="CVV"
            className="input"
          />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Tutar" className="input" />
        </div>

        <div>
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Taksit</span>
          <div className="flex flex-wrap gap-2">
            {installmentOptions.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setInstallment(n)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  installment === n ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                }`}
              >
                {n === 1 ? "Tek çekim" : `${n} taksit`}
                {n > 1 && numericAmount > 0 && (
                  <span className="ml-1 font-normal opacity-70">
                    · {formatCurrency(numericAmount / n, { withDecimals: false })}/ay
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {numericAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2.5 text-xs">
            <span className="text-muted">
              Komisyon %{(rate * 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} · −
              {formatCurrency(commission, { withDecimals: false })}
            </span>
            <span className="font-bold text-ink-900">Net {formatCurrency(net, { withDecimals: false })}</span>
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={!canSubmit || submitting}>
          {submitting ? "Tahsil ediliyor…" : `Ödemeyi al${numericAmount > 0 ? " · " + formatCurrency(numericAmount, { withDecimals: false }) : ""}`}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-muted">
          Kart verileri PCI-DSS uyumlu banka sanal POS'una iletilir; Akort kart numarasını saklamaz.
        </p>
      </form>
    </>
  );
}

const VALIDITY_OPTIONS = ["24 saat", "7 gün", "30 gün", "Süresiz"];
const LINK_INSTALLMENTS = [1, 3, 6, 9];
const OUTPUT_CHANNELS: PaymentLinkChannel[] = ["WhatsApp", "e-posta", "SMS"];

function LinkPanel({ onCreated }: { onCreated: () => void }) {
  const banking = useBanking();
  const [customer, setCustomer] = useState("Ege Market Zinciri");
  const [amountOpen, setAmountOpen] = useState(false);
  const [amount, setAmount] = useState("96.000,00");
  const [invoiceRef, setInvoiceRef] = useState("FTR-2026-1198");
  const [installments, setInstallments] = useState<Set<number>>(new Set([1]));
  const [reusable, setReusable] = useState(false);
  const [validity, setValidity] = useState("7 gün");
  const [output, setOutput] = useState<"link" | "qr">("link");
  const [channel, setChannel] = useState<PaymentLinkChannel>("WhatsApp");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<PaymentLink | null>(null);

  const slug = customer.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 24) || "tahsilat";
  const previewUrl = `akort.link/${slug}`;

  function toggleInstallment(n: number) {
    setInstallments((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      if (next.size === 0) next.add(1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const link = await banking.createPaymentLink({
      customer,
      amount: amountOpen ? 0 : parseAmount(amount),
      amountOpen,
      invoiceRef,
      installments: Array.from(installments).sort((a, b) => a - b),
      reusable,
      validityLabel: validity,
      output,
      channel: output === "qr" ? "QR" : channel,
    });
    setCreating(false);
    setCreated(link);
    onCreated();
  }

  return (
    <>
      <CardTitle>Ödeme linki / QR oluştur</CardTitle>
      <p className="mb-4 text-xs text-muted">Müşterin karta veya FAST ile öder, tahsilat otomatik eşleşir</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Müşteri</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} className="input" />
        </label>

        <div>
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Tutar</span>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAmountOpen(false)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                !amountOpen ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
              }`}
            >
              Sabit tutar
            </button>
            <button
              type="button"
              onClick={() => setAmountOpen(true)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                amountOpen ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
              }`}
            >
              Müşteri belirlesin
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={amountOpen ? "" : amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={amountOpen}
              placeholder={amountOpen ? "Müşteri girecek" : "Tutar"}
              className="input disabled:bg-cream-100 disabled:text-muted"
            />
            <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="Bağlı fatura" className="input" />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Sunulacak taksitler</span>
          <div className="flex flex-wrap gap-2">
            {LINK_INSTALLMENTS.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => toggleInstallment(n)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  installments.has(n) ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                }`}
              >
                {n === 1 ? "Tek çekim" : `${n} taksit`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-ink-900">Çok kullanımlık</p>
            <p className="text-xs text-muted">{reusable ? "Bağış/genel link — defalarca ödenebilir" : "Tek kullanımlık — bir kez ödenince kapanır"}</p>
          </div>
          <Toggle checked={reusable} onChange={() => setReusable((v) => !v)} label="Çok kullanımlık" />
        </div>

        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Geçerlilik</span>
          <select value={validity} onChange={(e) => setValidity(e.target.value)} className="input">
            {VALIDITY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Çıktı</span>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setOutput("link")}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                output === "link" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
              }`}
            >
              Link gönder
            </button>
            <button
              type="button"
              onClick={() => setOutput("qr")}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                output === "qr" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
              }`}
            >
              QR oluştur
            </button>
          </div>
          {output === "link" && (
            <div className="grid grid-cols-3 gap-2">
              {OUTPUT_CHANNELS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${
                    channel === c ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {output === "qr" ? (
          <div className="flex items-center gap-4 rounded-xl bg-cream-100 p-3">
            <QrPreview value={created?.url ?? previewUrl} className="h-24 w-24 shrink-0 rounded-lg bg-white p-1" />
            <div className="min-w-0 text-xs text-muted">
              <p className="font-mono text-ink-900">{created?.url ?? previewUrl}</p>
              <p className="mt-1">{reusable ? "Çok kullanımlık" : "Tek kullanımlık"} · {validity} geçerli</p>
              <p className="mt-1">Kasada göster veya faturaya bas.</p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-cream-100 px-3 py-2 font-mono text-xs text-muted">
            {created?.url ?? previewUrl} · {validity} geçerli
          </p>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={creating}>
          {creating
            ? "Oluşturuluyor…"
            : output === "qr"
              ? "QR oluştur →"
              : "Linki oluştur ve gönder →"}
        </Button>

        {created && (
          <p className="text-center text-xs font-semibold text-brand-500">
            ✓ {output === "qr" ? "QR hazır" : `Link ${channel} ile gönderildi`} — aktif linkler listesine eklendi.
          </p>
        )}
      </form>
    </>
  );
}

function PayByBankPanel({ onCreated }: { onCreated: () => void }) {
  const banking = useBanking();
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ url: string; net: number; fee: number } | null>(null);

  const amt = parseAmount(amount);
  const a2aFee = Math.round(amt * 0.003);
  const cardFee = Math.round(amt * 0.0189);
  const savings = cardFee - a2aFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || amt <= 0) return;
    setSaving(true);
    const req = await banking.createPayByBankRequest({ customer, amount: amt, invoiceRef: invoiceRef || undefined });
    setSaving(false);
    setCreated({ url: `akort.pay/bank/${req.id.slice(-6)}`, net: req.net, fee: req.fee });
    setCustomer("");
    setAmount("");
    setInvoiceRef("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-900/80">
        <span className="font-bold">Banka ile öde (A2A):</span> Müşteri kart yerine kendi banka uygulamasından öder.
        Anında hesabınıza geçer, komisyon kartın ~1/6'sı kadar.
      </p>
      <label className="block text-xs font-semibold text-ink-900">
        Müşteri
        <input className="input mt-1" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Müşteri adı" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-ink-900">
          Tutar
          <input className="input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label className="block text-xs font-semibold text-ink-900">
          Fatura no (ops.)
          <input className="input mt-1" value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="FTR-.." />
        </label>
      </div>

      {amt > 0 && (
        <div className="rounded-xl border border-line p-3 text-xs">
          <div className="flex justify-between py-0.5">
            <span className="text-muted">Kartla komisyon (~%1,89)</span>
            <span className="font-semibold text-negative-700 line-through">−{formatCurrency(cardFee, { withDecimals: false })}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-muted">Banka ile öde (~%0,3)</span>
            <span className="font-bold text-ink-900">−{formatCurrency(a2aFee, { withDecimals: false })}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-1.5">
            <span className="font-semibold text-brand-500">Bu tahsilatta tasarruf</span>
            <span className="font-bold text-brand-500">{formatCurrency(savings, { withDecimals: false })}</span>
          </div>
        </div>
      )}

      {created && (
        <div className="rounded-xl bg-cream-100 p-3 text-xs text-ink-900/80">
          <p className="font-bold">Ödeme bağlantısı oluşturuldu ✓</p>
          <p className="mt-1 font-mono text-brand-500">{created.url}</p>
          <p className="mt-1">Ödendiğinde net {formatCurrency(created.net, { withDecimals: false })} hesabınıza geçer.</p>
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={saving || !customer || amt <= 0}>
        {saving ? "Oluşturuluyor…" : "Banka ile öde bağlantısı oluştur"}
      </Button>
    </form>
  );
}
