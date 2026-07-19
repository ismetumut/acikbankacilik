import { createContext, useContext, type ReactNode } from "react";
import type { BankingProvider } from "./provider";
import { mockBankingProvider } from "./mockProvider";

// Swap point for a real Açık Bankacılık provider — see README.md.
const activeProvider: BankingProvider = mockBankingProvider;

const BankingContext = createContext<BankingProvider>(activeProvider);

export function BankingProviderRoot({ children }: { children: ReactNode }) {
  return <BankingContext.Provider value={activeProvider}>{children}</BankingContext.Provider>;
}

export function useBanking(): BankingProvider {
  return useContext(BankingContext);
}
