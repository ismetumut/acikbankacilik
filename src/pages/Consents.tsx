import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Toggle } from "@/components/ui/Toggle";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { LoadingRows } from "@/components/ui/Skeleton";
import { DEMO_NOW, bankOf } from "@/lib/mockData";
import { formatLongDate } from "@/lib/format";
import type { BankId } from "@/lib/types";

export function Consents() {
  const banking = useBanking();
  const { data: consents, refetch } = useAsync(() => banking.getConsents(), []);
  const { data: notifications, refetch: refetchNotifs } = useAsync(() => banking.getNotificationSettings(), []);
  const [renewingBankId, setRenewingBankId] = useState<BankId | null>(null);

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
