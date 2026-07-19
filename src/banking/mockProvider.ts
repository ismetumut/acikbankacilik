import type {
  Account,
  AssistantExchange,
  BankId,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  ConsentGrant,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  RecentPayment,
  ReportPackage,
} from "@/lib/types";
import {
  ACCOUNTS,
  ALL_COMPANIES,
  ASSISTANT_HISTORY,
  ASSISTANT_SUGGESTIONS,
  CASH_FLOW_30D,
  CASH_FLOW_FORECAST,
  CLIENTS,
  CONSENTS,
  DEMO_NOW,
  EXPECTED_INCOMING,
  EXPECTED_OUTGOING,
  NOTIFICATION_SETTINGS,
  OVERDUE_RECEIVABLES,
  PAYMENT_LINKS,
  PENDING_APPROVALS,
  RECENT_PAYMENTS,
  RECONCILIATION_EXCEPTIONS,
  REPORT_PACKAGES,
  TRANSACTIONS,
  bankOf,
} from "@/lib/mockData";
import type {
  BankingProvider,
  NewPaymentInput,
  NewPaymentLinkInput,
  TransactionPage,
  TransactionQuery,
} from "./provider";

/** Simulates realistic network latency for a mock/demo backend. */
function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let accounts = [...ACCOUNTS];
let transactions = [...TRANSACTIONS];
let consents = [...CONSENTS];
let pendingApprovals = [...PENDING_APPROVALS];
let recentPayments = [...RECENT_PAYMENTS];
let paymentLinks = [...PAYMENT_LINKS];
const overdueReceivables = [...OVERDUE_RECEIVABLES];
let reconciliationExceptions = [...RECONCILIATION_EXCEPTIONS];
let reportPackages = [...REPORT_PACKAGES];
let notificationSettings = [...NOTIFICATION_SETTINGS];
let assistantHistory = [...ASSISTANT_HISTORY];

export class MockBankingProvider implements BankingProvider {
  async getAccounts(companyId?: string): Promise<Account[]> {
    if (!companyId || companyId === ALL_COMPANIES) return delay(accounts);
    return delay(accounts.filter((a) => a.companyId === companyId));
  }

  async getTransactions(query: TransactionQuery): Promise<TransactionPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    let items = transactions;
    if (query.companyId && query.companyId !== ALL_COMPANIES) {
      const scopedAccountIds = new Set(
        accounts.filter((a) => a.companyId === query.companyId).map((a) => a.id),
      );
      items = items.filter((t) => scopedAccountIds.has(t.accountId));
    }
    if (query.bankId) items = items.filter((t) => t.bankId === query.bankId);
    if (query.category) items = items.filter((t) => t.category === query.category);
    if (query.hideVirman) items = items.filter((t) => t.category !== "Virman");
    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (t) =>
          t.counterparty.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term) ||
          (t.reference?.toLowerCase().includes(term) ?? false),
      );
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    return delay({ items: pageItems, total, page, pageSize });
  }

  async getConsents(): Promise<ConsentGrant[]> {
    return delay(consents);
  }

  async renewConsent(bankId: BankId): Promise<void> {
    consents = consents.map((c) =>
      c.bankId === bankId
        ? { ...c, status: "active", expiresAt: new Date(DEMO_NOW.getTime() + 1000 * 60 * 60 * 24 * 180).toISOString() }
        : c,
    );
    await delay(undefined, 400);
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    return delay(pendingApprovals);
  }

  async decideApproval(id: string, decision: "approve" | "reject"): Promise<void> {
    const approval = pendingApprovals.find((a) => a.id === id);
    pendingApprovals = pendingApprovals.filter((a) => a.id !== id);
    if (approval && decision === "approve") {
      recentPayments = [
        {
          id: `pay-${Date.now()}`,
          bankId: approval.bankId,
          recipient: approval.title,
          channel: "FAST",
          time: "şimdi",
          amount: approval.amount,
          status: "Bankada",
        },
        ...recentPayments,
      ];
    }
    await delay(undefined, 350);
  }

  async getRecentPayments(): Promise<RecentPayment[]> {
    return delay(recentPayments);
  }

  async createPayment(input: NewPaymentInput): Promise<RecentPayment> {
    const account = accounts.find((a) => a.id === input.sourceAccountId);
    const payment: RecentPayment = {
      id: `pay-${Date.now()}`,
      bankId: account?.bankId ?? "ziraat",
      recipient: input.recipient,
      channel: input.channel,
      time: "şimdi",
      amount: input.amount,
      status: "Bankada",
    };
    recentPayments = [payment, ...recentPayments];
    await delay(undefined, 500);
    return payment;
  }

  async getPaymentLinks(): Promise<PaymentLink[]> {
    return delay(paymentLinks);
  }

  async createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink> {
    const link: PaymentLink = {
      id: `link-${Date.now()}`,
      customer: input.customer,
      invoiceRef: input.invoiceRef || `FTR-2026-${Math.floor(1000 + Math.random() * 900)}`,
      channel: input.channel,
      sentAt: "şimdi gönderildi",
      amount: input.amount,
      status: "Bekliyor",
    };
    paymentLinks = [link, ...paymentLinks];
    await delay(undefined, 450);
    return link;
  }

  async getOverdueReceivables(): Promise<OverdueReceivable[]> {
    return delay(overdueReceivables);
  }

  async getReconciliationExceptions(): Promise<ReconciliationException[]> {
    return delay(reconciliationExceptions);
  }

  async matchReconciliation(exceptionId: string, _candidateId: string): Promise<void> {
    reconciliationExceptions = reconciliationExceptions.filter((e) => e.id !== exceptionId);
    await delay(undefined, 350);
  }

  async getCashFlow30d(): Promise<CashFlowPoint[]> {
    return delay(CASH_FLOW_30D);
  }

  async getCashFlowForecast(_horizonDays: number): Promise<CashFlowForecastPoint[]> {
    return delay(CASH_FLOW_FORECAST);
  }

  async getExpectedCashItems() {
    return delay({ incoming: EXPECTED_INCOMING, outgoing: EXPECTED_OUTGOING });
  }

  async getReportPackages(): Promise<ReportPackage[]> {
    return delay(reportPackages);
  }

  async generateReportPackage(): Promise<ReportPackage> {
    const pkg: ReportPackage = {
      id: `rep-${Date.now()}`,
      period: "2026 · 3. Çeyrek (taslak)",
      status: "Mühürlü",
      summary: `${transactions.length} hareket · 4 banka · az önce üretildi`,
      sha256: Math.random().toString(16).slice(2, 8) + "…" + Math.random().toString(16).slice(2, 6),
      generatedAt: "az önce",
    };
    reportPackages = [pkg, ...reportPackages];
    await delay(undefined, 700);
    return pkg;
  }

  async getClients(): Promise<ClientSummary[]> {
    return delay(CLIENTS);
  }

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return delay(notificationSettings);
  }

  async toggleNotification(id: string): Promise<void> {
    notificationSettings = notificationSettings.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n));
    await delay(undefined, 150);
  }

  async askAssistant(question: string): Promise<AssistantExchange> {
    const trimmed = question.trim();
    if (!trimmed) return assistantHistory[0];
    const exchange: AssistantExchange = {
      id: `asst-${Date.now()}`,
      question: trimmed,
      answeredAt: "şimdi",
      scannedAccounts: accounts.length,
      responseMs: 380,
      answer: `"${trimmed}" için ${accounts.length} hesap tarandı. Bu bir demo yanıtıdır — gerçek entegrasyonda bu soru banka hareketleriniz üzerinden canlı hesaplanır.`,
      rows: [],
    };
    assistantHistory = [exchange, ...assistantHistory];
    await delay(undefined, 500);
    return exchange;
  }
}

export { ASSISTANT_SUGGESTIONS, bankOf };
export const mockBankingProvider = new MockBankingProvider();
