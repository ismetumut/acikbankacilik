import { useEffect, useState } from "react";

export interface WidgetDef {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

export const OVERVIEW_WIDGETS: WidgetDef[] = [
  { id: "cashflow", label: "Nakit akışı grafiği", description: "Son 30 günün gelen/giden eğrisi", defaultOn: true },
  { id: "transactions", label: "Son hareketler", description: "En güncel 5 banka hareketi", defaultOn: true },
  { id: "todaySummary", label: "Bugünkü özet", description: "Gelen, giden ve mutabakat durumu", defaultOn: true },
  { id: "consent", label: "Rıza durumu", description: "Banka bağlantı izinleri", defaultOn: true },
  { id: "approvals", label: "Onay bekleyen ödemeler", description: "Ödeme tetikleme onay kuyruğu", defaultOn: false },
  { id: "reconciliation", label: "Mutabakat istisnaları", description: "Eşleşmeyen hareketler", defaultOn: false },
  { id: "collections", label: "Tahsilat özeti", description: "Vadesi geçen alacaklar", defaultOn: false },
  { id: "forecast", label: "Nakit akışı tahmini", description: "30 günlük bakiye projeksiyonu", defaultOn: false },
];

const STORAGE_KEY = "akort-overview-widgets";

function loadEnabled(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // fall through to defaults
  }
  return new Set(OVERVIEW_WIDGETS.filter((w) => w.defaultOn).map((w) => w.id));
}

export function useOverviewWidgets() {
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(enabled)));
  }, [enabled]);

  function toggle(id: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { enabled, toggle, isOn: (id: string) => enabled.has(id) };
}
