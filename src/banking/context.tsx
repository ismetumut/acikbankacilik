import { createContext, useContext, type ReactNode } from "react";
import { API_ENABLED } from "@/lib/api";
import type { BankingProvider } from "./provider";
import { mockBankingProvider } from "./mockProvider";
import { httpBankingProvider } from "./httpProvider";

// Real backend when an API URL is configured (dev / full deployment); otherwise
// the in-browser demo provider so the static build keeps working. See README.md.
const activeProvider: BankingProvider = API_ENABLED ? httpBankingProvider : mockBankingProvider;

const BankingContext = createContext<BankingProvider>(activeProvider);

export function BankingProviderRoot({ children }: { children: ReactNode }) {
  return <BankingContext.Provider value={activeProvider}>{children}</BankingContext.Provider>;
}

export function useBanking(): BankingProvider {
  return useContext(BankingContext);
}
