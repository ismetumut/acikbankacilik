import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBanking } from "@/banking/context";
import { useAsync } from "@/lib/useAsync";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Genel bakış",
  "/hareketler": "Hesap hareketleri",
  "/bakiyeler": "Bakiyeler",
  "/odeme-tetikleme": "Ödeme tetikleme (TÖS)",
  "/tahsilat": "Tahsilat",
  "/mutabakat": "Mutabakat",
  "/nakit-akisi": "Nakit akışı tahmini",
  "/asistan": "Asistan",
  "/raporlar": "Raporlar & denetim",
  "/rizalar": "Rızalar & bildirimler",
  "/musteri-paneli": "Müşteri paneli",
  "/kurulum": "Kurulum sihirbazı",
  "/mobil": "Mobil uygulama",
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const banking = useBanking();
  const { data: accounts } = useAsync(() => banking.getAccounts(), []);
  const [query, setQuery] = useState("");

  const title = ROUTE_TITLES[location.pathname] ?? "Akort";
  const bankCount = accounts ? new Set(accounts.map((a) => a.bankId)).size : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/hareketler?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-8">
      <h1 className="font-display text-[22px] font-extrabold text-ink-900">{title}</h1>
      <div className="flex items-center gap-3">
        <form onSubmit={handleSubmit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="⌕  Hareket, IBAN, firma ara…"
            className="w-72 rounded-full border border-line bg-cream-100 px-4 py-2 text-sm text-ink-900 placeholder:text-muted focus:border-brand-400 focus:outline-none"
          />
        </form>
        <span className="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink-900">
          <span className="h-2 w-2 rounded-full bg-brand-400" />
          {bankCount ?? "…"} banka bağlı
        </span>
        <button
          type="button"
          title="Karanlık tema yakında"
          className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink-900/60"
        >
          ☾ Karanlık
        </button>
      </div>
    </header>
  );
}
