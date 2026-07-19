import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { Money } from "@/components/ui/Money";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";

const CHANNELS = ["FAST", "EFT", "Havale"] as const;

export function PaymentInitiation() {
  const banking = useBanking();
  const { data: accounts } = useAsync(() => banking.getAccounts(), []);
  const { data: approvals, refetch: refetchApprovals } = useAsync(() => banking.getPendingApprovals(), []);
  const { data: payments, refetch: refetchPayments } = useAsync(() => banking.getRecentPayments(), []);

  const [sourceAccountId, setSourceAccountId] = useState("");
  const [recipient, setRecipient] = useState("Anadolu Ambalaj San. — TR58 **** 4471");
  const [amount, setAmount] = useState("46.600,00");
  const [description, setDescription] = useState('"FTR-2026-1201 ödemesi"');
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("FAST");
  const [submitting, setSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const baseTodayTotal = 214_300;
  const triggeredJustNow = payments?.filter((p) => p.time === "şimdi").reduce((s, p) => s + p.amount, 0) ?? 0;
  const todayTotal = baseTodayTotal + triggeredJustNow;
  const approvalsTotal = approvals?.reduce((s, a) => s + a.amount, 0) ?? 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceAccountId) return;
    setSubmitting(true);
    const numeric = Number(amount.replace(/\./g, "").replace(",", "."));
    await banking.createPayment({
      sourceAccountId,
      recipient: recipient.split(" — ")[0],
      iban: recipient.split(" — ")[1] ?? "",
      amount: numeric,
      description,
      channel,
    });
    setSubmitting(false);
    refetchPayments();
  }

  async function handleDecision(id: string, decision: "approve" | "reject") {
    setDecidingId(id);
    await banking.decideApproval(id, decision);
    setDecidingId(null);
    refetchApprovals();
    refetchPayments();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bugün tetiklenen" value={formatCurrency(todayTotal, { withDecimals: false })} hint="6 ödeme · 3 banka" />
        <StatTile
          label="Onay bekleyen"
          value={approvals?.length ?? "…"}
          hint={`toplam ${formatCurrency(approvalsTotal, { withDecimals: false })}`}
        />
        <StatTile label="Planlanmış" value={4} hint="en yakını: KDV · 26 Tem" />
        <StatTile label="Ödeme rızası" value="3 / 4 banka" hint="Yapı Kredi için izin gerekli" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardTitle>Yeni ödeme</CardTitle>
          <p className="mb-4 text-xs text-muted">Banka uygulamasına girmeden, buradan tetikle</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Kaynak hesap</span>
              <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="input" required>
                <option value="">Hesap seçin</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {formatCurrency(a.balance, { withDecimals: false })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Alıcı</span>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="input" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Tutar</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Tarih</span>
                <input defaultValue="Bugün" className="input" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">Açıklama</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                    channel === c ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-brand-50 p-3 text-xs text-ink-900/80">
              <span className="font-bold">AI kontrollü:</span> Alıcı IBAN geçmişteki 12 ödemeyle uyumlu · fatura
              FTR-2026-1201 açık bakiyesiyle birebir eşleşiyor.
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={submitting || !sourceAccountId}>
              {submitting ? "Gönderiliyor…" : "Onaya gönder →"}
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Çift onay kuralı aktif: ₺25.000 üstü ödemeler ikinci yetkilinin onayını bekler. Tetikleme TCMB Açık
              Bankacılık ödeme emri rızasıyla, bankanın kendi onay adımı üzerinden gerçekleşir.
            </p>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Onay bekleyenler</CardTitle>
                <Badge tone="warning">{approvals?.length ?? 0}</Badge>
              </div>
              <span className="text-xs text-muted">onaylayan: Selin Demir</span>
            </CardHeader>
            {!approvals ? (
              <LoadingRows rows={3} />
            ) : approvals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Bekleyen onay yok.</p>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{a.title}</p>
                      <p className="truncate text-xs text-muted">
                        {a.subtitle} {a.risky && <span className="text-warning-700">⚠</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Money value={a.amount} size="sm" className="w-20 text-right" />
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={decidingId === a.id}
                        onClick={() => handleDecision(a.id, "approve")}
                      >
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={decidingId === a.id}
                        onClick={() => handleDecision(a.id, "reject")}
                      >
                        Reddet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Son ödemeler</CardTitle>
              <span className="text-sm font-semibold text-brand-500">Tümü →</span>
            </CardHeader>
            {!payments ? (
              <LoadingRows rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                      <th className="pb-2">Banka</th>
                      <th className="pb-2">Alıcı</th>
                      <th className="pb-2">Kanal · saat</th>
                      <th className="pb-2 text-right">Tutar</th>
                      <th className="pb-2 text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5">
                          <BankAvatar bankId={p.bankId} size="sm" />
                        </td>
                        <td className="py-2.5 font-medium text-ink-900">{p.recipient}</td>
                        <td className="py-2.5 text-xs text-muted">
                          {p.channel} · {p.time}
                        </td>
                        <td className="py-2.5 text-right">
                          <Money value={p.amount} size="sm" />
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge tone={p.status === "Tamamlandı" ? "positive" : p.status === "Reddedildi" ? "negative" : "warning"}>
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
