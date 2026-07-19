import { DEMO_NOW } from "./mockData";

const tryFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const tryFormatterNoDecimals = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Splits a formatted amount into integer and decimal parts for styling (e.g. smaller decimals). */
export function splitAmount(value: number): { sign: string; whole: string; decimals: string } {
  const sign = value < 0 ? "-" : "";
  const [whole, decimals] = tryFormatter.format(Math.abs(value)).split(",");
  return { sign, whole, decimals };
}

export function formatCurrency(value: number, options?: { withDecimals?: boolean }): string {
  const withDecimals = options?.withDecimals ?? true;
  const formatted = withDecimals
    ? tryFormatter.format(Math.abs(value))
    : tryFormatterNoDecimals.format(Math.abs(value));
  const sign = value < 0 ? "−" : "";
  return `${sign}₺${formatted}`;
}

export function formatSignedCurrency(value: number): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}₺${tryFormatter.format(Math.abs(value))}`;
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    return `${sign}₺${(abs / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₺${(abs / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}B`;
  }
  return formatCurrency(value);
}

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const longDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return longDateFormatter.format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const diffMs = DEMO_NOW.getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return "şimdi";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} gün önce`;
}
