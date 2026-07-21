import type {
  Account,
  AssistantExchange,
  BankId,
  CardCollection,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  ConsentGrant,
  CopResult,
  ErpCari,
  ErpInvoice,
  ErpMapping,
  ExpectedCashItem,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  PayByBankRequest,
  RecentPayment,
  RecurringPayment,
  ReportPackage,
  Subscription,
} from "@/lib/types";
import { api } from "@/lib/api";
import type {
  BankingProvider,
  CardPaymentInput,
  CardPaymentResult,
  NewPayByBankInput,
  NewPaymentInput,
  NewPaymentLinkInput,
  NewRecurringInput,
  NewSubscriptionInput,
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
  confirmPayee(input: { iban: string; name: string }): Promise<CopResult> {
    return api<CopResult>("/payments/confirm-payee", { method: "POST", body: input });
  }

  getRecurringPayments(): Promise<RecurringPayment[]> {
    return api<RecurringPayment[]>("/recurring");
  }
  createRecurringPayment(input: NewRecurringInput): Promise<RecurringPayment> {
    return api<RecurringPayment>("/recurring", { method: "POST", body: input });
  }
  async setRecurringStatus(id: string, status: "active" | "paused" | "completed"): Promise<void> {
    await api(`/recurring/${id}/status`, { method: "POST", body: { status } });
  }
  async runRecurringNow(id: string): Promise<void> {
    await api(`/recurring/${id}/run`, { method: "POST" });
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
  async refundCardCollection(id: string): Promise<void> {
    await api(`/card-collections/${id}/refund`, { method: "POST" });
  }

  getPayByBankRequests(): Promise<PayByBankRequest[]> {
    return api<PayByBankRequest[]>("/pay-by-bank");
  }
  createPayByBankRequest(input: NewPayByBankInput): Promise<PayByBankRequest> {
    return api<PayByBankRequest>("/pay-by-bank", { method: "POST", body: input });
  }
  async markPayByBankPaid(id: string): Promise<void> {
    await api(`/pay-by-bank/${id}/pay`, { method: "POST" });
  }
  async refundPayByBank(id: string): Promise<void> {
    await api(`/pay-by-bank/${id}/refund`, { method: "POST" });
  }

  getSubscriptions(): Promise<Subscription[]> {
    return api<Subscription[]>("/subscriptions");
  }
  createSubscription(input: NewSubscriptionInput): Promise<Subscription> {
    return api<Subscription>("/subscriptions", { method: "POST", body: input });
  }
  async chargeSubscriptionNow(id: string): Promise<void> {
    await api(`/subscriptions/${id}/charge`, { method: "POST" });
  }
  async setSubscriptionStatus(id: string, status: "active" | "paused" | "canceled"): Promise<void> {
    await api(`/subscriptions/${id}/status`, { method: "POST", body: { status } });
  }

  getReconciliationExceptions(): Promise<ReconciliationException[]> {
    return api<ReconciliationException[]>("/reconciliation");
  }
  async matchReconciliation(exceptionId: string, candidateId: string): Promise<void> {
    await api(`/reconciliation/${exceptionId}/match`, { method: "POST", body: { candidateId } });
  }

  getErpCariList(): Promise<ErpCari[]> {
    return api<ErpCari[]>("/erp/cari");
  }
  getErpInvoices(): Promise<ErpInvoice[]> {
    return api<ErpInvoice[]>("/erp/invoices");
  }
  getErpMappings(): Promise<ErpMapping[]> {
    return api<ErpMapping[]>("/erp/mappings");
  }
  async saveErpMapping(key: string, cariId: string): Promise<void> {
    await api("/erp/mappings", { method: "POST", body: { key, cariId } });
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
