import { useEffect, useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Toggle } from "@/components/ui/Toggle";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { LoadingRows } from "@/components/ui/Skeleton";
import { DEMO_NOW, bankOf } from "@/lib/mockData";
import { formatLongDate } from "@/lib/format";
import type { BankId, ConnectableBank } from "@/lib/types";

const SCA_STEPS = [
  "Bankanın güvenli sayfasına yönlendiriliyorsunuz…",
  "Güçlü kimlik doğrulama (SCA) — mobil onay bekleniyor…",
  "Rıza kapsamını onaylayın (hesap bilgisi paylaşımı)",
  "Bağlantı tamamlandı ✓",
];

export function Consents() {
  const banking = useBanking();
  const { data: consents, refetch } = useAsync(() => banking.getConsents(), []);
  const { data: notifications, refetch: refetchNotifs } = useAsync(() => banking.getNotificationSettings(), []);
  const { data: catalog, refetch: refetchCatalog } = useAsync(() => banking.getBankCatalog(), []);
  const [renewingBankId, setRenewingBankId] = useState<BankId | null>(null);
  const [scaBank, setScaBank] = useState<ConnectableBank | null>(null);

  async function handleRenew(bankId: BankId) {
    setRenewingBankId(bankId);
    await banking.renewConsent(bankId);
    setRenewingBankId(null);
    refetch();
  }

  async function handleToggle(id: string) {
    await banking.toggleNotification(id);
    refetchNotifs();
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-muted">
        "Bankayla konuşma izni" — bankalarınız hesap hareketlerinizi Akort ile paylaşmak için sizden 6 ayda bir izin
        ister. Süresi dolmadan biz hatırlatırız; yenilemek tek tık sürer.
      </p>

      {!consents ? (
        <LoadingRows rows={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {consents.map((c) => {
            const bank = bankOf(c.bankId);
            const totalMs = new Date(c.expiresAt).getTime() - new Date(c.grantedAt).getTime();
            const remainingMs = new Date(c.expiresAt).getTime() - DEMO_NOW.getTime();
            const remainingPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
            const daysLeft = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));
            const isExpiring = c.status === "expiring";

            return (
              <Card key={c.bankId} className={isExpiring ? "border-warning-700/40 bg-warning-100/30" : ""}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BankAvatar bankId={c.bankId} />
                    <div>
                      <p className="font-bold text-ink-900">{bank.name}</p>
                      <p className="text-xs text-muted">
                        {c.accountsCount} hesap · {c.scopeLabel}
                      </p>
                    </div>
                  </div>
                  <Badge tone={isExpiring ? "warning" : "positive"}>{isExpiring ? `${daysLeft} gün kaldı` : "Aktif"}</Badge>
                </div>
                <div className="mb-3 flex items-center justify-between text-xs text-muted">
                  <span>İzin süresi</span>
                  <span>{formatLongDate(c.expiresAt)}'ya kadar</span>
                </div>
                <ProgressBar value={remainingPct} tone={isExpiring ? "warning" : "brand"} className="mb-4" />
                <Button
                  variant={isExpiring ? "primary" : "secondary"}
                  className="w-full"
                  disabled={renewingBankId === c.bankId}
                  onClick={() => handleRenew(c.bankId)}
                >
                  {renewingBankId === c.bankId ? "Yenileniyor…" : isExpiring ? "Tek tıkla yenile" : "İzni yönet"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Banka bağla</CardTitle>
            <p className="text-xs text-muted">BKM Açık Bankacılık geçidi · SCA ile güvenli bağlantı</p>
          </div>
          <Badge tone="brand">{catalog?.filter((b) => b.connected).length ?? 0} / {catalog?.length ?? 0} bağlı</Badge>
        </CardHeader>
        {!catalog ? (
          <LoadingRows rows={4} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {catalog.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: b.colorHex }}
                  >
                    {b.initials}
                  </span>
                  <span className="truncate text-xs font-semibold text-ink-900">{b.name}</span>
                </div>
                {b.connected ? (
                  <span className="shrink-0 text-[10px] font-bold text-brand-500">✓</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setScaBank(b)}
                    className="shrink-0 rounded-lg bg-brand-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-ink-900"
                  >
                    Bağla
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {scaBank && (
        <ScaConnectModal
          bank={scaBank}
          onClose={() => setScaBank(null)}
          onConnected={async () => {
            await banking.connectBank(scaBank.id);
            setScaBank(null);
            refetchCatalog();
          }}
        />
      )}

      <Card>
        <CardTitle className="mb-4">Bildirimler</CardTitle>
        {!notifications ? (
          <LoadingRows rows={5} />
        ) : (
          <div className="divide-y divide-line">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-bold text-ink-900">{n.title}</p>
                  <p className="text-xs text-muted">{n.description}</p>
                </div>
                <Toggle checked={n.enabled} onChange={() => handleToggle(n.id)} label={n.title} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ScaConnectModal({
  bank,
  onClose,
  onConnected,
}: {
  bank: ConnectableBank;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [step, setStep] = useState(0);

  // 0→1→2 otomatik ilerler (redirect + SCA simülasyonu); 2. adımda kullanıcı rızayı onaylar.
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 1400);
      return () => clearTimeout(t);
    }
    if (step === 1) {
      const t = setTimeout(() => setStep(2), 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{ backgroundColor: bank.colorHex }}
          >
            {bank.initials}
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900">{bank.name}</p>
            <p className="text-xs text-muted">Açık Bankacılık bağlantısı (SCA)</p>
          </div>
        </div>

        <ol className="mb-5 space-y-2.5">
          {SCA_STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={i} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    state === "done"
                      ? "bg-brand-500 text-white"
                      : state === "active"
                        ? "bg-brand-100 text-brand-600"
                        : "bg-cream-200 text-ink-900/40"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={`text-sm ${state === "todo" ? "text-muted" : "text-ink-900"}`}>
                  {label}
                  {state === "active" && i < 2 && <span className="ml-1 inline-block animate-pulse">…</span>}
                </span>
              </li>
            );
          })}
        </ol>

        {step === 2 ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-cream-100 p-3 text-xs text-ink-900/80">
              <span className="font-bold">Rıza kapsamı:</span> Hesap listesi, bakiye ve son 12 ay hareketleri · 6 ay
              geçerli · istediğiniz an iptal edilebilir.
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Vazgeç
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setStep(3)}>
                Rızayı onayla
              </Button>
            </div>
          </div>
        ) : step === 3 ? (
          <Button variant="primary" className="w-full" onClick={onConnected}>
            Bağlantıyı tamamla
          </Button>
        ) : (
          <p className="text-center text-xs text-muted">Bankanıza güvenli şekilde bağlanılıyor…</p>
        )}
      </div>
    </div>
  );
}
