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

const DEFAULT_LEFT = ["cashflow", "forecast", "transactions"];
const DEFAULT_RIGHT = ["todaySummary", "approvals", "reconciliation", "collections", "consent"];

const STORAGE_KEY_V1 = "akort-overview-widgets";
const STORAGE_KEY = "akort-overview-layout";

interface LayoutState {
  enabled: string[];
  left: string[];
  right: string[];
}

const KNOWN_IDS = new Set(OVERVIEW_WIDGETS.map((w) => w.id));

/** Drops unknown ids and re-appends any widget missing from both columns (new widgets added later). */
function normalize(state: LayoutState): LayoutState {
  const left = state.left.filter((id) => KNOWN_IDS.has(id));
  const right = state.right.filter((id) => KNOWN_IDS.has(id));
  const placed = new Set([...left, ...right]);
  DEFAULT_LEFT.forEach((id) => {
    if (!placed.has(id)) left.push(id);
  });
  DEFAULT_RIGHT.forEach((id) => {
    if (!placed.has(id)) right.push(id);
  });
  return { enabled: state.enabled.filter((id) => KNOWN_IDS.has(id)), left, right };
}

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw) as LayoutState);
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      return normalize({ enabled: JSON.parse(v1) as string[], left: DEFAULT_LEFT, right: DEFAULT_RIGHT });
    }
  } catch {
    // fall through to defaults
  }
  return {
    enabled: OVERVIEW_WIDGETS.filter((w) => w.defaultOn).map((w) => w.id),
    left: DEFAULT_LEFT,
    right: DEFAULT_RIGHT,
  };
}

export type ColumnId = "left" | "right";

export function useOverviewWidgets() {
  const [layout, setLayout] = useState<LayoutState>(loadLayout);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  function toggle(id: string) {
    setLayout((prev) => ({
      ...prev,
      enabled: prev.enabled.includes(id) ? prev.enabled.filter((e) => e !== id) : [...prev.enabled, id],
    }));
  }

  /** Moves a widget to `targetCol`, inserted before the visible widget at `targetIndex` (append if omitted). */
  function move(id: string, targetCol: ColumnId, beforeId?: string) {
    setLayout((prev) => {
      const left = prev.left.filter((w) => w !== id);
      const right = prev.right.filter((w) => w !== id);
      const target = targetCol === "left" ? left : right;
      const idx = beforeId ? target.indexOf(beforeId) : -1;
      if (idx >= 0) target.splice(idx, 0, id);
      else target.push(id);
      return { ...prev, left, right };
    });
  }

  return {
    isOn: (id: string) => layout.enabled.includes(id),
    toggle,
    move,
    leftOrder: layout.left,
    rightOrder: layout.right,
  };
}
