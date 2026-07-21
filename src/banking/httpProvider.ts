import type {
  Account,
  AssistantExchange,
  BankId,
  CardCollection,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  ConsentGrant,
  ExpectedCashItem,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  RecentPayment,
  ReportPackage,
} from "@/lib/types";
import { api } from "@/lib/api";
import type {
  BankingProvider,
  CardPaymentInput,
  CardPaymentResult,
  NewPaymentInput,
  NewPaymentLinkInput,
  PaymentBatchInput,
  TransactionPage,
  TransactionQuery,
} from "./provider";

/**
 * Real backend implementation of {@link BankingProvider}. Every method maps to a
 * REST endpoint served by `server/`. Because it satisfies the same interface as
 * the demo provider, no page or component changes when this is swapped in.
 */
export class HttpBankingProvider implements BankingProvider {
  getAccounts(companyId?: string): Promise<Account[]> {
    return api<Account[]>("/accounts", { query: { companyId } });
  }

  getTransactions(query: TransactionQuery): Promise<TransactionPage> {
    return api<TransactionPage>("/transactions", {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        bankId: query.bankId,
        category: query.category,
        search: query.search,
        hideVirman: query.hideVirman,
        companyId: query.companyId,
      },
    });
  }

  getConsents(): Promise<ConsentGrant[]> {
    return api<ConsentGrant[]>("/consents");
  }
  async renewConsent(bankId: BankId): Promise<void> {
    await api(`/consents/${bankId}/renew`, { method: "POST" });
  }

  getPendingApprovals(): Promise<PendingApproval[]> {
    return api<PendingApproval[]>("/approvals");
  }
  async decideApproval(id: string, decision: "approve" | "reject"): Promise<void> {
    await api(`/approvals/${id}/decide`, { method: "POST", body: { decision } });
  }
  submitPaymentBatch(input: PaymentBatchInput): Promise<PendingApproval[]> {
    return api<PendingApproval[]>("/approvals/batch", { method: "POST", body: input });
  }

  getRecentPayments(): Promise<RecentPayment[]> {
    return api<RecentPayment[]>("/payments");
  }
  createPayment(input: NewPaymentInput): Promise<RecentPayment> {
    return api<RecentPayment>("/payments", { method: "POST", body: input });
  }

  getPaymentLinks(): Promise<PaymentLink[]> {
    return api<PaymentLink[]>("/payment-links");
  }
  createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink> {
    return api<PaymentLink>("/payment-links", { method: "POST", body: input });
  }
  getOverdueReceivables(): Promise<OverdueReceivable[]> {
    return api<OverdueReceivable[]>("/overdue");
  }

  takeCardPayment(input: CardPaymentInput): Promise<CardPaymentResult> {
    return api<CardPaymentResult>("/card-payment", { method: "POST", body: input });
  }
  getRecentCardCollections(): Promise<CardCollection[]> {
    return api<CardCollection[]>("/card-collections");
  }

  getReconciliationExceptions(): Promise<ReconciliationException[]> {
    return api<ReconciliationException[]>("/reconciliation");
  }
  async matchReconciliation(exceptionId: string, candidateId: string): Promise<void> {
    await api(`/reconciliation/${exceptionId}/match`, { method: "POST", body: { candidateId } });
  }

  getCashFlow30d(): Promise<CashFlowPoint[]> {
    return api<CashFlowPoint[]>("/cashflow/30d");
  }
  getCashFlowForecast(horizonDays: number): Promise<CashFlowForecastPoint[]> {
    return api<CashFlowForecastPoint[]>("/cashflow/forecast", { query: { horizonDays } });
  }
  getExpectedCashItems(): Promise<{ incoming: ExpectedCashItem[]; outgoing: ExpectedCashItem[] }> {
    return api("/cashflow/expected");
  }

  getReportPackages(): Promise<ReportPackage[]> {
    return api<ReportPackage[]>("/reports");
  }
  generateReportPackage(): Promise<ReportPackage> {
    return api<ReportPackage>("/reports/generate", { method: "POST" });
  }

  getClients(): Promise<ClientSummary[]> {
    return api<ClientSummary[]>("/clients");
  }

  getNotificationSettings(): Promise<NotificationSetting[]> {
    return api<NotificationSetting[]>("/notifications");
  }
  async toggleNotification(id: string): Promise<void> {
    await api(`/notifications/${id}/toggle`, { method: "POST" });
  }

  askAssistant(question: string): Promise<AssistantExchange> {
    return api<AssistantExchange>("/assistant", { method: "POST", body: { question } });
  }
}

export const httpBankingProvider = new HttpBankingProvider();
