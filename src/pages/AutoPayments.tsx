import { useMemo, useState } from "react";
import { useBanking } from "@/banking/context";
import { useCompany } from "@/company/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { LoadingRows } from "@/components/ui/Skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { RECURRING_KIND_META, FREQUENCY_LABEL } from "@/lib/recurring";
import type { RecurringKind, RecurringPayment } from "@/lib/types";
import type { NewRecurringInput } from "@/banking/provider";

const KIND_ORDER: RecurringKind[] = ["standing_order", "scheduled", "vrp", "sweep"];

function statusBadge(s: RecurringPayment["status"]) {
  if (s === "active") return <Badge tone="positive">Aktif</Badge>;
  if (s === "paused") return <Badge tone="warning">Duraklatıldı</Badge>;
  return <Badge tone="neutral">Tamamlandı</Badge>;
}

export function AutoPayments() {
  const banking = useBanking();
  const { companyId } = useCompany();
  const { data: items, loading, refetch } = useAsync(() => banking.getRecurringPayments(), []);
  const { data: accounts } = useAsync(() => banking.getAccounts(companyId), [companyId]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const active = items?.filter((r) => r.status === "active") ?? [];
  const monthlyTotal = active
    .filter((r) => r.frequency === "monthly" && r.kind !== "sweep")
    .reduce((s, r) => s + r.amount, 0);
  const nextRun = [...active].sort((a, b) => +new Date(a.nextRun) - +new Date(b.nextRun))[0];
  const vrp = items?.find((r) => r.kind === "vrp");

  async function act(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    await fn();
    setBusyId(null);
    refetch();
  }

  const grouped = useMemo(() => {
    const map = new Map<RecurringKind, RecurringPayment[]>();
    for (const r of items ?? []) map.set(r.kind, [...(map.get(r.kind) ?? []), r]);
    return map;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Aktif talimat" value={active.length} hint={`${items?.length ?? 0} toplam`} />
        <StatTile label="Bu ay otomatik" value={formatCurrency(monthlyTotal, { withDecimals: false })} hint="aylık tekrarlı ödemeler" tone="positive" />
        <StatTile
          label="VRP kullanımı"
          value={vrp ? `${formatCurrency(vrp.vrpUsedThisPeriod ?? 0, { withDecimals: false })}` : "—"}
          hint={vrp ? `dönem sınırı ${formatCurrency(vrp.vrpMaxPerPeriod ?? 0, { withDecimals: false })}` : "VRP yok"}
        />
        <StatTile label="Sıradaki çalışma" value={nextRun ? formatDate(nextRun.nextRun) : "—"} hint={nextRun?.label ?? ""} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Otomatik ödeme talimatları</CardTitle>
            <p className="text-xs text-muted">Planlı · tekrarlı (standing order) · VRP · sweep — hepsi tek yerde</p>
          </div>
          <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Kapat" : "+ Yeni talimat"}
          </Button>
        </CardHeader>

        {showForm && (
          <CreateForm
            accounts={accounts ?? []}
            onCreate={async (input) => {
              await banking.createRecurringPayment(input);
              setShowForm(false);
              refetch();
            }}
          />
        )}

        {loading ? (
          <LoadingRows rows={5} />
        ) : (
          <div className="mt-2 space-y-6">
            {KIND_ORDER.filter((k) => grouped.has(k)).map((kind) => {
              const meta = RECURRING_KIND_META[kind];
              return (
                <div key={kind}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <h3 className="font-display text-sm font-extrabold text-ink-900">{meta.label}</h3>
                    <span className="text-xs text-muted">— {meta.desc}</span>
                  </div>
                  <div className="space-y-2">
                    {grouped.get(kind)!.map((r) => (
                      <div key={r.id} className="rounded-xl border border-line p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <BankAvatar bankId={r.bankId} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-ink-900">{r.label}</p>
                              <p className="truncate text-xs text-muted">
                                {r.recipient} · {FREQUENCY_LABEL[r.frequency]} · sıradaki {formatDate(r.nextRun)}
                                {r.runsCount ? ` · ${r.runsCount} kez çalıştı` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-bold tabular text-ink-900">
                              {r.kind === "sweep"
                                ? `≥ ${formatCurrency(r.sweepKeepBalance ?? 0, { withDecimals: false })} üstü`
                                : r.amountVariable
                                  ? `≤ ${formatCurrency(r.amount, { withDecimals: false })} / sefer`
                                  : formatCurrency(r.amount, { withDecimals: false })}
                            </span>
                            {statusBadge(r.status)}
                          </div>
                        </div>

                        {r.kind === "vrp" && (
                          <p className="mt-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[11px] text-ink-900/80">
                            VRP yetkisi · dönem kullanımı{" "}
                            <span className="font-bold">{formatCurrency(r.vrpUsedThisPeriod ?? 0, { withDecimals: false })}</span> /{" "}
                            {formatCurrency(r.vrpMaxPerPeriod ?? 0, { withDecimals: false })} — banka rızası dahilinde otomatik
                          </p>
                        )}

                        {r.status !== "completed" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, () => banking.runRecurringNow(r.id))}
                            >
                              {busyId === r.id ? "…" : "Şimdi çalıştır"}
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={busyId === r.id}
                              onClick={() =>
                                act(r.id, () => banking.setRecurringStatus(r.id, r.status === "active" ? "paused" : "active"))
                              }
                            >
                              {r.status === "active" ? "Duraklat" : "Sürdür"}
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, () => banking.setRecurringStatus(r.id, "completed"))}
                            >
                              İptal et
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function CreateForm({
  accounts,
  onCreate,
}: {
  accounts: { id: string; bankId: string; label: string; balance: number; currency: string }[];
  onCreate: (input: NewRecurringInput) => Promise<void>;
}) {
  const [kind, setKind] = useState<RecurringKind>("standing_order");
  const [label, setLabel] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [iban, setIban] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<NewRecurringInput["frequency"]>("monthly");
  const [firstRun, setFirstRun] = useState("");
  const [vrpMax, setVrpMax] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [keepBalance, setKeepBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const num = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
  const canSave = label && sourceAccountId && firstRun && (kind === "sweep" ? targetAccountId : recipient);

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    await onCreate({
      kind,
      label,
      sourceAccountId,
      recipient: kind === "sweep" ? accounts.find((a) => a.id === targetAccountId)?.label ?? "Hedef hesap" : recipient,
      iban: iban || undefined,
      amount: kind === "vrp" ? num(amount) : kind === "sweep" ? 0 : num(amount),
      amountVariable: kind === "vrp",
      frequency: kind === "scheduled" ? "once" : frequency,
      firstRun: new Date(firstRun).toISOString(),
      vrpMaxPerPeriod: kind === "vrp" ? num(vrpMax) : undefined,
      targetAccountId: kind === "sweep" ? targetAccountId : undefined,
      sweepKeepBalance: kind === "sweep" ? num(keepBalance) : undefined,
    });
    setSaving(false);
  }

  return (
    <div className="mb-4 rounded-xl border border-line bg-cream-100 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-ink-900">
          Talimat türü
          <select className="input mt-1" value={kind} onChange={(e) => setKind(e.target.value as RecurringKind)}>
            {KIND_ORDER.map((k) => (
              <option key={k} value={k}>
                {RECURRING_KIND_META[k].icon} {RECURRING_KIND_META[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-900">
          Etiket
          <input className="input mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ör. KDV ödemesi" />
        </label>
        <label className="text-xs font-semibold text-ink-900">
          Kaynak hesap
          <select className="input mt-1" value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}>
            <option value="">Seçin</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        {kind === "sweep" ? (
          <>
            <label className="text-xs font-semibold text-ink-900">
              Hedef hesap
              <select className="input mt-1" value={targetAccountId} onChange={(e) => setTargetAccountId(e.target.value)}>
                <option value="">Seçin</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-900">
              Tutulacak bakiye
              <input className="input mt-1" value={keepBalance} onChange={(e) => setKeepBalance(e.target.value)} placeholder="50.000" />
            </label>
          </>
        ) : (
          <>
            <label className="text-xs font-semibold text-ink-900">
              Alıcı
              <input className="input mt-1" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Alıcı adı" />
            </label>
            <label className="text-xs font-semibold text-ink-900">
              IBAN
              <input className="input mt-1" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR.." />
            </label>
            <label className="text-xs font-semibold text-ink-900">
              {kind === "vrp" ? "Sefer başı üst sınır" : "Tutar"}
              <input className="input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </label>
            {kind === "vrp" && (
              <label className="text-xs font-semibold text-ink-900">
                Dönem üst sınırı
                <input className="input mt-1" value={vrpMax} onChange={(e) => setVrpMax(e.target.value)} placeholder="0" />
              </label>
            )}
          </>
        )}

        {kind !== "scheduled" && (
          <label className="text-xs font-semibold text-ink-900">
            Frekans
            <select className="input mt-1" value={frequency} onChange={(e) => setFrequency(e.target.value as NewRecurringInput["frequency"])}>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </label>
        )}
        <label className="text-xs font-semibold text-ink-900">
          {kind === "scheduled" ? "Ödeme tarihi" : "İlk çalışma"}
          <input type="date" className="input mt-1" value={firstRun} onChange={(e) => setFirstRun(e.target.value)} />
        </label>
      </div>
      <Button variant="primary" className="mt-4 w-full" disabled={!canSave || saving} onClick={submit}>
        {saving ? "Kaydediliyor…" : "Talimatı oluştur"}
      </Button>
    </div>
  );
}
