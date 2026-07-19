import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/BankAvatar";
import { LoadingRows } from "@/components/ui/Skeleton";
import type { BadgeTone } from "@/components/ui/Badge";
import type { ClientSummary } from "@/lib/types";

const STATUS_TONE: Record<ClientSummary["consentStatus"], BadgeTone> = {
  Aktif: "positive",
  Uyarı: "warning",
  "Süresi doldu": "negative",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ClientPanel() {
  const banking = useBanking();
  const { data: clients } = useAsync(() => banking.getClients(), []);
  const totalBanks = clients?.reduce((s, c) => s + c.bankCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Ofisinizin {clients?.length ?? "…"} müşterisi tek girişten yönetiliyor · toplam {totalBanks ?? "…"} banka
          hesabı
        </p>
        <Button variant="primary">+ Müşteri ekle</Button>
      </div>

      <Card>
        {!clients ? (
          <LoadingRows rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3">Müşteri</th>
                  <th className="pb-2 pr-3">Banka</th>
                  <th className="pb-2 pr-3">Bekleyen istisna</th>
                  <th className="pb-2 pr-3">Rıza durumu</th>
                  <th className="pb-2 pr-3">Son senkron</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar initials={initialsOf(c.name)} />
                        <div>
                          <p className="font-bold text-ink-900">{c.name}</p>
                          <p className="text-xs text-muted">{c.sector}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-ink-900/80">{c.bankCount}</td>
                    <td className="py-3 pr-3">
                      {c.pendingExceptions > 0 ? (
                        <span className="font-bold text-warning-700">{c.pendingExceptions} istisna</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={STATUS_TONE[c.consentStatus]}>
                        {c.consentStatus === "Uyarı" ? `Uyarı — ${c.consentDetail}` : c.consentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted">{c.lastSync}</td>
                    <td className="py-3 text-right">
                      <button className="text-sm font-semibold text-brand-500 hover:underline">Aç →</button>
                    </td>
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
