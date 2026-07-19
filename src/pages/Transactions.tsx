import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BankAvatar } from "@/components/ui/BankAvatar";
import { Money } from "@/components/ui/Money";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingRows } from "@/components/ui/Skeleton";
import { Toggle } from "@/components/ui/Toggle";
import { formatDateTime } from "@/lib/format";
import { BANKS } from "@/lib/mockData";
import type { AccountingStatus, BankId } from "@/lib/types";

const CATEGORIES = ["Tahsilat", "Vergi & SGK", "Tedarikçi", "Kira", "Maaş", "Döviz", "Virman", "Eşleşmedi"];

const STATUS_TONE: Record<AccountingStatus, "positive" | "warning" | "negative"> = {
  Aktarıldı: "positive",
  Bekliyor: "warning",
  Hata: "negative",
};

export function Transactions() {
  const banking = useBanking();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [bankId, setBankId] = useState<BankId | "">("");
  const [category, setCategory] = useState("");
  const [hideVirman, setHideVirman] = useState(true);
  const pageSize = 10;

  const { data, loading } = useAsync(
    () =>
      banking.getTransactions({
        page,
        pageSize,
        search,
        bankId: bankId || undefined,
        category: category || undefined,
        hideVirman: category === "Virman" ? false : hideVirman,
      }),
    [page, search, bankId, category, hideVirman],
  );

  function clearFilters() {
    setSearch("");
    setBankId("");
    setCategory("");
    setHideVirman(true);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">Filtre</CardTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Başlangıç tarihi">
            <input type="text" defaultValue="10.07.2026 00:00" className="input" />
          </Field>
          <Field label="Bitiş tarihi">
            <input type="text" defaultValue="17.07.2026 23:59" className="input" />
          </Field>
          <Field label="Banka">
            <select
              value={bankId}
              onChange={(e) => {
                setBankId(e.target.value as BankId | "");
                setPage(1);
              }}
              className="input"
            >
              <option value="">Tümü</option>
              {BANKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategori">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Tümü</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Karşı taraf / IBAN ara">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              type="text"
              placeholder="Ara…"
              className="input"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <Toggle
              checked={hideVirman}
              onChange={() => {
                setHideVirman((v) => !v);
                setPage(1);
              }}
              label="Virmanları hariç tut"
            />
            <div>
              <p className="text-sm font-semibold text-ink-900">Virmanları hariç tut</p>
              <p className="text-xs text-muted">Kendi hesaplarınız arasındaki transferler listeden gizlenir</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearFilters}>
              Temizle
            </Button>
            <Button variant="primary">Listele</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Hesap hareketleri</CardTitle>
            <p className="text-xs text-muted">
              {data?.total ?? "…"} kayıt · 4 banka · son senkron şimdi
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              ⟳ Yenile
            </Button>
            <Button variant="secondary" size="sm">
              Excel ▾
            </Button>
            <Button variant="primary" size="sm">
              Logo Tiger'a aktar
            </Button>
          </div>
        </CardHeader>

        {loading || !data ? (
          <LoadingRows rows={10} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-3">Banka</th>
                    <th className="pb-2 pr-3">Tarih</th>
                    <th className="pb-2 pr-3">Açıklama</th>
                    <th className="pb-2 pr-3">Kategori</th>
                    <th className="pb-2 pr-3 text-right">Tutar</th>
                    <th className="pb-2 pr-3 text-right">Bakiye</th>
                    <th className="pb-2 pr-3">Hesap</th>
                    <th className="pb-2">Muhasebe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((t) => (
                    <tr key={t.id} className="align-middle">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <BankAvatar bankId={t.bankId} size="sm" />
                          <span className="text-xs font-semibold text-ink-900/80">
                            {BANKS.find((b) => b.id === t.bankId)?.shortName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-xs text-muted">{formatDateTime(t.date)}</td>
                      <td className="py-3 pr-3 max-w-[260px] truncate font-medium text-ink-900">{t.description}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={t.category === "Eşleşmedi" ? "warning" : t.category === "Virman" ? "brand" : "neutral"}>
                          {t.category}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Money value={t.amount} signed size="sm" colorize />
                      </td>
                      <td className="py-3 pr-3 text-right text-xs tabular text-muted">
                        ₺{t.balanceAfter.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-xs text-muted">Vadesiz TL</td>
                      <td className="py-3">
                        <Badge tone={STATUS_TONE[t.accountingStatus]}>{t.accountingStatus}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
