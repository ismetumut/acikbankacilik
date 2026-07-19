import type {
  Account,
  AssistantExchange,
  BankId,
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
  Transaction,
} from "@/lib/types";

export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  bankId?: BankId;
  category?: string;
  search?: string;
  hideVirman?: boolean;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewPaymentInput {
  sourceAccountId: string;
  recipient: string;
  iban: string;
  amount: number;
  description: string;
  channel: "FAST" | "EFT" | "Havale";
}

export interface NewPaymentLinkInput {
  customer: string;
  amount: number;
  invoiceRef: string;
  installments: "Tek çekim" | "3 taksit" | "6 taksit";
  channel: "WhatsApp" | "e-posta" | "SMS";
}

/**
 * Abstraction over a real Açık Bankacılık (Open Banking) integration.
 *
 * `MockBankingProvider` implements this against realistic in-memory data so the
 * whole product works end-to-end today. To go live, implement this same
 * interface against a licensed TR Open Banking provider (account information +
 * payment initiation service) and swap it in `src/banking/context.tsx` — no
 * page/component needs to change. See README.md "Gerçek banka entegrasyonu".
 */
export interface BankingProvider {
  getAccounts(): Promise<Account[]>;
  getTransactions(query: TransactionQuery): Promise<TransactionPage>;

  getConsents(): Promise<ConsentGrant[]>;
  renewConsent(bankId: BankId): Promise<void>;

  getPendingApprovals(): Promise<PendingApproval[]>;
  decideApproval(id: string, decision: "approve" | "reject"): Promise<void>;

  getRecentPayments(): Promise<RecentPayment[]>;
  createPayment(input: NewPaymentInput): Promise<RecentPayment>;

  getPaymentLinks(): Promise<PaymentLink[]>;
  createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink>;
  getOverdueReceivables(): Promise<OverdueReceivable[]>;

  getReconciliationExceptions(): Promise<ReconciliationException[]>;
  matchReconciliation(exceptionId: string, candidateId: string): Promise<void>;

  getCashFlow30d(): Promise<CashFlowPoint[]>;
  getCashFlowForecast(horizonDays: number): Promise<CashFlowForecastPoint[]>;
  getExpectedCashItems(): Promise<{ incoming: ExpectedCashItem[]; outgoing: ExpectedCashItem[] }>;

  getReportPackages(): Promise<ReportPackage[]>;
  generateReportPackage(): Promise<ReportPackage>;

  getClients(): Promise<ClientSummary[]>;

  getNotificationSettings(): Promise<NotificationSetting[]>;
  toggleNotification(id: string): Promise<void>;

  askAssistant(question: string): Promise<AssistantExchange>;
}
