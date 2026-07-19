import { splitAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  value: number;
  signed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  colorize?: boolean;
  currencySymbol?: string;
}

const SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-[40px] leading-none",
};

const DECIMAL_SIZE = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-base",
  xl: "text-xl",
};

export function Money({ value, signed = false, size = "md", className, colorize = false, currencySymbol = "₺" }: Props) {
  const { whole, decimals } = splitAmount(value);
  const sign = value < 0 ? "−" : signed ? "+" : "";
  const colorClass = colorize ? (value < 0 ? "text-negative-700" : "text-brand-500") : "";

  return (
    <span className={cn("font-display tabular font-bold", SIZE_CLASSES[size], colorClass, className)}>
      {sign}
      {currencySymbol}
      {whole}
      <span className={`${DECIMAL_SIZE[size]} font-semibold opacity-60`}>,{decimals}</span>
    </span>
  );
}
