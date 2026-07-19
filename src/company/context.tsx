import { createContext, useContext, useState, type ReactNode } from "react";
import { ALL_COMPANIES } from "@/lib/mockData";

interface CompanyContextValue {
  companyId: string;
  setCompanyId: (id: string) => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  companyId: "demir-ticaret",
  setCompanyId: () => {},
});

export function CompanyProviderRoot({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState<string>("demir-ticaret");
  return <CompanyContext.Provider value={{ companyId, setCompanyId }}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}

export function isConsolidated(companyId: string): boolean {
  return companyId === ALL_COMPANIES;
}
