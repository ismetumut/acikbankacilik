import type {
  Account,
  ApprovalRole,
  AssistantExchange,
  BankId,
  Beneficiary,
  DirectDebitMandate,
  IncomeInsight,
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
  PayByBankRequest,
  SanctionsResult,
  SettlementBatch,
  Subscription,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PaymentLinkChannel,
  PendingApproval,
  ReconciliationException,
  RecentPayment,
  RecurringFrequency,
  RecurringKind,
  RecurringPayment,
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
  /** Aynı ödemenin tekrar gönderilmesini engeller (idempotency). */
  idempotencyKey?: string;
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

export interface NewRecurringInput {
  kind: RecurringKind;
  label: string;
  sourceAccountId: string;
  recipient: string;
  iban?: string;
  amount: number;
  amountVariable?: boolean;
  frequency: RecurringFrequency;
  firstRun: string; // ISO
  endDate?: string;
  vrpMaxPerPeriod?: number;
  targetAccountId?: string;
  sweepKeepBalance?: number;
}

export interface NewPayByBankInput {
  customer: string;
  amount: number;
  invoiceRef?: string;
}

export interface NewSubscriptionInput {
  customer: string;
  planLabel: string;
  amount: number;
  frequency: "weekly" | "monthly";
  method: "a2a" | "card";
  firstCharge: string; // ISO
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

  // AIS derinliği: lehdarlar, DD mandaları, gelir/harcanabilirlik içgörüsü
  getBeneficiaries(): Promise<Beneficiary[]>;
  getDirectDebitMandates(): Promise<DirectDebitMandate[]>;
  getIncomeInsights(companyId?: string): Promise<IncomeInsight>;

  getConsents(): Promise<ConsentGrant[]>;
  renewConsent(bankId: BankId): Promise<void>;

  getPendingApprovals(): Promise<PendingApproval[]>;
  /** Advances the next pending step in the approval chain (approve), or removes the request (reject). */
  decideApproval(id: string, decision: "approve" | "reject"): Promise<void>;
  submitPaymentBatch(input: PaymentBatchInput): Promise<PendingApproval[]>;

  getRecentPayments(): Promise<RecentPayment[]>;
  createPayment(input: NewPaymentInput): Promise<RecentPayment>;
  /** Confirmation of Payee: göndermeden önce alıcı adı/IBAN doğrulaması. */
  confirmPayee(input: { iban: string; name: string }): Promise<CopResult>;

  // Otomatik ödeme talimatları: planlı / tekrarlı / VRP / sweep
  getRecurringPayments(): Promise<RecurringPayment[]>;
  createRecurringPayment(input: NewRecurringInput): Promise<RecurringPayment>;
  setRecurringStatus(id: string, status: "active" | "paused" | "completed"): Promise<void>;
  /** Talimatı hemen çalıştırır (bir ödeme oluşturur, sonraki tarihi ilerletir). */
  runRecurringNow(id: string): Promise<void>;

  getPaymentLinks(): Promise<PaymentLink[]>;
  createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink>;
  getOverdueReceivables(): Promise<OverdueReceivable[]>;

  /** Sanal POS / mail-order: kartı çekip tahsilatı gerçekleştirir. */
  takeCardPayment(input: CardPaymentInput): Promise<CardPaymentResult>;
  getRecentCardCollections(): Promise<CardCollection[]>;
  /** Kart tahsilatını iade et. */
  refundCardCollection(id: string): Promise<void>;

  // Banka ile öde (A2A / "Pay by bank") tahsilat
  getPayByBankRequests(): Promise<PayByBankRequest[]>;
  createPayByBankRequest(input: NewPayByBankInput): Promise<PayByBankRequest>;
  /** Demo: müşteri ödemesini simüle eder (anında settle). */
  markPayByBankPaid(id: string): Promise<void>;
  refundPayByBank(id: string): Promise<void>;

  // Abonelik / tekrarlı tahsilat (VRP mandası)
  getSubscriptions(): Promise<Subscription[]>;
  createSubscription(input: NewSubscriptionInput): Promise<Subscription>;
  chargeSubscriptionNow(id: string): Promise<void>;
  setSubscriptionStatus(id: string, status: "active" | "paused" | "canceled"): Promise<void>;

  // Hakediş / settlement (T+1) + uyum
  getSettlements(): Promise<SettlementBatch[]>;
  /** Yaptırım / PEP taraması (KYC-AML). */
  screenPayee(name: string): Promise<SanctionsResult>;

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
