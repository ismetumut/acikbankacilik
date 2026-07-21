import { useEffect, useState } from "react";
import { useBanking } from "@/banking/context";
import { useCompany } from "@/company/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { Money } from "@/components/ui/Money";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";
import { COMPANY, CURRENCY_SYMBOLS, ERP_CARI_LIST, TEAM_MEMBERS } from "@/lib/mockData";
import { PIS_STATUS_META } from "@/lib/pis";
import type { ApprovalChainInput, PaymentLineInput } from "@/banking/provider";
import type { ApprovalStep, CopResult, PisStatus } from "@/lib/types";

function pisBadgeTone(s: PisStatus): "positive" | "negative" | "warning" {
  if (s === "completed") return "positive";
  if (s === "rejected" || s === "failed") return "negative";
  return "warning";
}

const CHANNELS = ["FAST", "EFT", "Havale"] as const;
const MAX_APPROVERS = 3;

interface LineState {
  key: string;
  sourceAccountId: string;
  recipientMode: "manual" | "erp";
  erpCariId: string;
  recipientName: string;
  recipientIban: string;
  amount: string;
  description: string;
  channel: (typeof CHANNELS)[number];
}

function emptyLine(): LineState {
  return {
    key: Math.random().toString(36).slice(2),
    sourceAccountId: "",
    recipientMode: "manual",
    erpCariId: "",
    recipientName: "Anadolu Ambalaj San.",
    recipientIban: "TR58 **** 4471",
    amount: "",
    description: "",
    channel: "FAST",
  };
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
}

export function PaymentInitiation() {
  const banking = useBanking();
  const { companyId } = useCompany();
  const { data: accounts } = useAsync(() => banking.getAccounts(companyId), [companyId]);
  const { data: approvals, refetch: refetchApprovals } = useAsync(() => banking.getPendingApprovals(), []);
  const { data: payments, refetch: refetchPayments } = useAsync(() => banking.getRecentPayments(), []);

  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [controller, setController] = useState("");
  const [approvers, setApprovers] = useState<{ key: string; person: string }[]>([
    { key: Math.random().toString(36).slice(2), person: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [copChecks, setCopChecks] = useState<{ recipient: string; result: CopResult }[]>([]);

  const baseTodayTotal = 214_300;
  const triggeredJustNow = payments?.filter((p) => p.time === "şimdi").reduce((s, p) => s + p.amount, 0) ?? 0;
  const todayTotal = baseTodayTotal + triggeredJustNow;
  const approvalsTotal = approvals?.reduce((s, a) => s + a.amount, 0) ?? 0;

  const lineTotal = lines.reduce((s, l) => s + parseAmount(l.amount), 0);
  const linesBankCount = new Set(
    lines.map((l) => accounts?.find((a) => a.id === l.sourceAccountId)?.bankId).filter(Boolean),
  ).size;

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function addApprover() {
    setApprovers((prev) =>
      prev.length < MAX_APPROVERS ? [...prev, { key: Math.random().toString(36).slice(2), person: "" }] : prev,
    );
  }

  function removeApprover(key: string) {
    setApprovers((prev) => (prev.length > 1 ? prev.filter((a) => a.key !== key) : prev));
  }

  const canSubmit =
    lines.every(
      (l) =>
        l.sourceAccountId &&
        parseAmount(l.amount) > 0 &&
        (l.recipientMode === "erp" ? l.erpCariId : l.recipientName.trim()),
    ) &&
    controller &&
    approvers[0]?.person;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const lineInputs: PaymentLineInput[] = lines.map((l) => {
      const erpCari = l.recipientMode === "erp" ? ERP_CARI_LIST.find((c) => c.id === l.erpCariId) : undefined;
      return {
        sourceAccountId: l.sourceAccountId,
        recipient: erpCari ? erpCari.name : l.recipientName,
        iban: erpCari ? erpCari.iban : l.recipientIban,
        amount: parseAmount(l.amount),
        description: l.description,
        channel: l.channel,
      };
    });

    // Confirmation of Payee: göndermeden önce her satırda alıcı adı/IBAN doğrula.
    // İlk denemede uyuşmazlık varsa uyar ve dur; kullanıcı tekrar basınca (bilerek) devam.
    if (copChecks.length === 0) {
      const results = await Promise.all(
        lineInputs.map(async (l) => ({ recipient: l.recipient, result: await banking.confirmPayee({ iban: l.iban, name: l.recipient }) })),
      );
      const problems = results.filter((r) => r.result.outcome === "no_match" || r.result.outcome === "close_match");
      if (problems.length > 0) {
        setCopChecks(problems);
        setSubmitting(false);
        return;
      }
    }

    const chainInput: ApprovalChainInput[] = [
      { role: "Düzenleyen", person: COMPANY.userName },
      { role: "Kontrol eden", person: controller },
      ...approvers.filter((a) => a.person).map((a) => ({ role: "Onaycı" as const, person: a.person })),
    ];

    await banking.submitPaymentBatch({ lines: lineInputs, chain: chainInput });
    setSubmitting(false);
    setCopChecks([]);
    setLines([emptyLine()]);
    setController("");
    setApprovers([{ key: Math.random().toString(36).slice(2), person: "" }]);
    refetchApprovals();
  }

  async function handleDecision(id: string, decision: "approve" | "reject") {
    setDecidingId(id);
    await banking.decideApproval(id, decision);
    setDecidingId(null);
    refetchApprovals();
    refetchPayments();
  }

  // Ödeme durumu canlı ilerlesin diye bankaya iletilmiş ödeme varken periyodik yenile.
  const hasSettlingPayment = payments?.some((p) => p.pisStatus === "submitted" || p.pisStatus === "settling");
  useEffect(() => {
    if (!hasSettlingPayment) return;
    const t = setInterval(() => refetchPayments(), 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSettlingPayment]);

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle>Yeni ödeme</CardTitle>
          <p className="mb-4 text-xs text-muted">
            Banka uygulamasına girmeden, farklı hesap ve bankalardan tek seferde tetikle
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {lines.map((line, i) => (
                <PaymentLineRow
                  key={line.key}
                  index={i}
                  line={line}
                  accounts={accounts ?? []}
                  onChange={(patch) => updateLine(line.key, patch)}
                  onRemove={lines.length > 1 ? () => removeLine(line.key) : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="w-full rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-ink-900/70 hover:bg-cream-100"
            >
              + Satır ekle
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-100 px-3 py-2.5 text-xs text-ink-900/80">
              <span>
                <span className="font-bold">{lines.length}</span> ödeme ·{" "}
                <span className="font-bold">{formatCurrency(lineTotal, { withDecimals: false })}</span> toplam
              </span>
              <span>
                <span className="font-bold">{linesBankCount || 0}</span> farklı banka
              </span>
            </div>

            <div className="border-t border-line pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Onay zinciri</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-cream-100 px-3 py-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                    1
                  </span>
                  <span className="text-muted">Düzenleyen</span>
                  <span className="ml-auto font-semibold text-ink-900">{COMPANY.userName} (siz)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                    2
                  </span>
                  <span className="w-28 shrink-0 text-sm text-muted">Kontrol eden</span>
                  <select value={controller} onChange={(e) => setController(e.target.value)} className="input" required>
                    <option value="">Kişi seçin</option>
                    {TEAM_MEMBERS.filter((m) => m !== COMPANY.userName).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                {approvers.map((ap, i) => (
                  <div key={ap.key} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                      {3 + i}
                    </span>
                    <span className="w-28 shrink-0 text-sm text-muted">Onaycı {i + 1}</span>
                    <select
                      value={ap.person}
                      onChange={(e) =>
                        setApprovers((prev) => prev.map((p) => (p.key === ap.key ? { ...p, person: e.target.value } : p)))
                      }
                      className="input"
                      required={i === 0}
                    >
                      <option value="">Kişi seçin</option>
                      {TEAM_MEMBERS.filter((m) => m !== COMPANY.userName).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    {approvers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeApprover(ap.key)}
                        className="shrink-0 text-muted hover:text-negative-700"
                        aria-label="Onaycıyı kaldır"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {approvers.length < MAX_APPROVERS && (
                  <button
                    type="button"
                    onClick={addApprover}
                    className="ml-7 text-xs font-semibold text-brand-500 hover:underline"
                  >
                    + Onaycı ekle
                  </button>
                )}
              </div>
            </div>

            {copChecks.length === 0 ? (
              <div className="rounded-xl bg-brand-50 p-3 text-xs text-ink-900/80">
                <span className="font-bold">Confirmation of Payee:</span> Onaya göndermeden önce her alıcının adı,
                IBAN'ın gerçek hesap sahibiyle otomatik doğrulanır.
              </div>
            ) : (
              <div className="rounded-xl border border-warning-700/30 bg-warning-100 p-3 text-xs text-warning-700">
                <p className="mb-1.5 font-bold">⚠ Alıcı doğrulama uyarısı — göndermeden kontrol edin</p>
                <ul className="space-y-1">
                  {copChecks.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">{c.recipient}</span>: {c.result.reason}
                      {c.result.suggestedName && (
                        <> · bankadaki ad: <span className="font-semibold">{c.result.suggestedName}</span></>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5">Yine de göndermek için butona tekrar basın.</p>
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting || !canSubmit}
            >
              {submitting
                ? "Gönderiliyor…"
                : copChecks.length > 0
                  ? `Uyarıya rağmen onaya gönder → (${lines.length})`
                  : `Onaya gönder → (${lines.length})`}
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
            </CardHeader>
            {!approvals ? (
              <LoadingRows rows={3} />
            ) : approvals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Bekleyen onay yok.</p>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => {
                  const nextStep = a.chain.find((s) => s.status === "Bekliyor");
                  return (
                    <div key={a.id} className="rounded-xl border border-line p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">{a.title}</p>
                          <p className="truncate text-xs text-muted">
                            {a.subtitle} {a.risky && <span className="text-warning-700">⚠</span>}
                          </p>
                        </div>
                        <Money value={a.amount} size="sm" className="shrink-0 text-right" />
                      </div>

                      <ApprovalChainStepper chain={a.chain} />

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={decidingId === a.id}
                          onClick={() => handleDecision(a.id, "approve")}
                          className="flex-1"
                        >
                          {nextStep ? `Onayla (${nextStep.role}: ${nextStep.person})` : "Onayla"}
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
                  );
                })}
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
                          {p.pisStatus ? (
                            <Badge tone={pisBadgeTone(p.pisStatus)}>
                              {(p.pisStatus === "submitted" || p.pisStatus === "settling") && (
                                <span className="mr-1 inline-block animate-pulse">●</span>
                              )}
                              {PIS_STATUS_META[p.pisStatus].label}
                            </Badge>
                          ) : (
                            <Badge tone={p.status === "Tamamlandı" ? "positive" : p.status === "Reddedildi" ? "negative" : "warning"}>
                              {p.status}
                            </Badge>
                          )}
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

function ApprovalChainStepper({ chain }: { chain: ApprovalStep[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {chain.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            title={`${s.role}: ${s.person}`}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
              s.status === "Tamamlandı" ? "bg-brand-100 text-brand-600" : "bg-cream-200 text-ink-900/60"
            }`}
          >
            {s.status === "Tamamlandı" ? "✓" : i + 1} {s.person}
          </span>
          {i < chain.length - 1 && <span className="text-line">→</span>}
        </div>
      ))}
    </div>
  );
}

function PaymentLineRow({
  index,
  line,
  accounts,
  onChange,
  onRemove,
}: {
  index: number;
  line: LineState;
  accounts: { id: string; label: string; bankId: string; currency: string; balance: number }[];
  onChange: (patch: Partial<LineState>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Ödeme {index + 1}</p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-muted hover:text-negative-700" aria-label="Satırı kaldır">
            ✕
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        <select
          value={line.sourceAccountId}
          onChange={(e) => onChange({ sourceAccountId: e.target.value })}
          className="input"
          required
        >
          <option value="">Kaynak hesap seçin</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} · {CURRENCY_SYMBOLS[a.currency as keyof typeof CURRENCY_SYMBOLS]}
              {a.balance.toLocaleString("tr-TR")}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ recipientMode: "manual" })}
            className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
              line.recipientMode === "manual" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
            }`}
          >
            Manuel gir
          </button>
          <button
            type="button"
            onClick={() => onChange({ recipientMode: "erp" })}
            className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
              line.recipientMode === "erp" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-900"
            }`}
          >
            ERP'den seç (Logo Tiger)
          </button>
        </div>

        {line.recipientMode === "manual" ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={line.recipientName}
              onChange={(e) => onChange({ recipientName: e.target.value })}
              placeholder="Alıcı adı"
              className="input"
              required
            />
            <input
              value={line.recipientIban}
              onChange={(e) => onChange({ recipientIban: e.target.value })}
              placeholder="IBAN"
              className="input"
            />
          </div>
        ) : (
          <select value={line.erpCariId} onChange={(e) => onChange({ erpCariId: e.target.value })} className="input" required>
            <option value="">Cari seçin</option>
            {ERP_CARI_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.iban.slice(0, 8)}…
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            value={line.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="Tutar"
            className="input"
            required
          />
          <select value={line.channel} onChange={(e) => onChange({ channel: e.target.value as LineState["channel"] })} className="input">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input
          value={line.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Açıklama"
          className="input"
        />
      </div>
    </div>
  );
}
