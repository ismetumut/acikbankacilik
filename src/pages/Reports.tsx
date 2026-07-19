import { useState } from "react";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingRows } from "@/components/ui/Skeleton";

export function Reports() {
  const banking = useBanking();
  const { data: packages, refetch } = useAsync(() => banking.getReportPackages(), []);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    await banking.generateReportPackage();
    setGenerating(false);
    refetch();
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Denetim modu</CardTitle>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Mali müşavir veya vergi denetimi için dönemsel, <span className="font-bold text-ink-900">değiştirilemez</span>{" "}
            rapor paketi üretir. Her paket zaman damgalı ve SHA-256 özetiyle mühürlenir.
          </p>
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={generating}>
          {generating ? "Üretiliyor…" : "Yeni paket üret"}
        </Button>
      </Card>

      {!packages ? (
        <LoadingRows rows={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-center justify-between">
                <CardTitle>{p.period}</CardTitle>
                <Badge tone={p.status === "Mühürlü" ? "positive" : "neutral"}>{p.status}</Badge>
              </div>
              <p className="text-sm text-muted">{p.summary}</p>
              <p className="mt-3 rounded-lg bg-cream-100 px-2.5 py-1.5 font-mono text-[11px] text-muted">
                sha256: {p.sha256} · {p.generatedAt}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1">
                  PDF
                </Button>
                <Button size="sm" variant="secondary" className="flex-1">
                  Excel
                </Button>
                <Button size="sm" variant="secondary" className="flex-1">
                  Paylaş
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>e-Defter çapraz kontrol</CardTitle>
          <p className="mt-1 text-sm text-muted">683 banka hareketi ↔ 651 e-Fatura/e-Arşiv kaydı karşılaştırıldı</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="positive">639 uyumlu</Badge>
          <Badge tone="warning">12 istisna</Badge>
        </div>
      </Card>
    </div>
  );
}
