import type {
  Account,
  ApprovalRole,
  AssistantExchange,
  BankId,
  CardCollection,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  ConsentGrant,
  ErpCari,
  ErpInvoice,
  ErpMapping,
  ExpectedCashItem,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PaymentLinkChannel,
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
  companyId?: string;
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

export interface PaymentLineInput {
  sourceAccountId: string;
  recipient: string;
  iban: string;
  amount: number;
  description: string;
  channel: "FAST" | "EFT" | "Havale";
}

export interface ApprovalChainInput {
  role: ApprovalRole;
  person: string;
}

export interface PaymentBatchInput {
  lines: PaymentLineInput[];
  chain: ApprovalChainInput[];
}

export interface NewPaymentLinkInput {
  customer: string;
  /** amountOpen true ise tutar müşteriye bırakılır ve bu değer 0'dır. */
  amount: number;
  amountOpen: boolean;
  invoiceRef: string;
  /** İzin verilen taksit sayıları; 1 = tek çekim. */
  installments: number[];
  reusable: boolean;
  validityLabel: string;
  output: "link" | "qr";
  channel: PaymentLinkChannel;
}

export interface CardPaymentInput {
  cardNumber: string;
  holder: string;
  amount: number;
  installment: number; // 1 = tek çekim
  customer?: string;
}

export interface CardPaymentResult {
  reference: string;
  approved: boolean;
  bank: string;
  amount: number;
  installment: number;
  commission: number;
  net: number;
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
  getAccounts(companyId?: string): Promise<Account[]>;
  getTransactions(query: TransactionQuery): Promise<TransactionPage>;

  getConsents(): Promise<ConsentGrant[]>;
  renewConsent(bankId: BankId): Promise<void>;

  getPendingApprovals(): Promise<PendingApproval[]>;
  /** Advances the next pending step in the approval chain (approve), or removes the request (reject). */
  decideApproval(id: string, decision: "approve" | "reject"): Promise<void>;
  submitPaymentBatch(input: PaymentBatchInput): Promise<PendingApproval[]>;

  getRecentPayments(): Promise<RecentPayment[]>;
  createPayment(input: NewPaymentInput): Promise<RecentPayment>;

  getPaymentLinks(): Promise<PaymentLink[]>;
  createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink>;
  getOverdueReceivables(): Promise<OverdueReceivable[]>;

  /** Sanal POS / mail-order: kartı çekip tahsilatı gerçekleştirir. */
  takeCardPayment(input: CardPaymentInput): Promise<CardPaymentResult>;
  getRecentCardCollections(): Promise<CardCollection[]>;

  getReconciliationExceptions(): Promise<ReconciliationException[]>;
  matchReconciliation(exceptionId: string, candidateId: string): Promise<void>;

  // ERP eşleştirme motoru verileri + öğrenme döngüsü
  getErpCariList(): Promise<ErpCari[]>;
  getErpInvoices(): Promise<ErpInvoice[]>;
  getErpMappings(): Promise<ErpMapping[]>;
  saveErpMapping(key: string, cariId: string): Promise<void>;

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
