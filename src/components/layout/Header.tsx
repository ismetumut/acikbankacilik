import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBanking } from "@/banking/context";
import { useCompany } from "@/company/context";
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
  "/admin": "Admin panel · API Hub",
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const banking = useBanking();
  const { companyId } = useCompany();
  const { data: accounts } = useAsync(() => banking.getAccounts(companyId), [companyId]);
  const [query, setQuery] = useState("");

  const title = ROUTE_TITLES[location.pathname] ?? "Akort";
  const bankCount = accounts ? new Set(accounts.map((a) => a.bankId)).size : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/hareketler?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:h-[72px] sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Menüyü aç"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-900 hover:bg-cream-100 lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="truncate font-display text-lg font-extrabold text-ink-900 sm:text-[22px]">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <form onSubmit={handleSubmit} className="hidden md:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="⌕  Hareket, IBAN, firma ara…"
            className="w-56 rounded-full border border-line bg-cream-100 px-4 py-2 text-sm text-ink-900 placeholder:text-muted focus:border-brand-400 focus:outline-none lg:w-72"
          />
        </form>
        <button
          type="button"
          onClick={() => navigate("/hareketler")}
          aria-label="Hareket, IBAN, firma ara"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-900 md:hidden"
        >
          ⌕
        </button>
        <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink-900 sm:flex">
          <span className="h-2 w-2 rounded-full bg-brand-400" />
          {bankCount ?? "…"} banka bağlı
        </span>
        <button
          type="button"
          title="Karanlık tema yakında"
          className="hidden rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink-900/60 sm:inline-flex"
        >
          ☾ Karanlık
        </button>
      </div>
    </header>
  );
}
