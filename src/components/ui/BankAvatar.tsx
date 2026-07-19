import type { BankId } from "@/lib/types";
import { bankOf } from "@/lib/mockData";

export function BankAvatar({ bankId, size = "md" }: { bankId: BankId; size?: "sm" | "md" | "lg" }) {
  const bank = bankOf(bankId);
  const sizeClass = size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${sizeClass}`}
      style={{ backgroundColor: bank.colorHex }}
      title={bank.name}
    >
      {bank.initials}
    </div>
  );
}

export function InitialsAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-warning-100 font-display font-bold text-warning-700 ${sizeClass}`}
    >
      {initials}
    </div>
  );
}
