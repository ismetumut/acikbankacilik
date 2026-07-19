export type BankId = "ziraat" | "isbankasi" | "garanti" | "yapikredi";

export interface Bank {
  id: BankId;
  name: string;
  shortName: string;
  initials: string;
  colorHex: string;
}

export interface Account {
  id: string;
  bankId: BankId;
  label: string;
  subLabel: string;
  iban: string;
  currency: "TRY" | "USD" | "EUR" | "GBP";
  balance: number;
  availableBalance: number;
  lastSync: string; // ISO timestamp
  kind: "vadesiz" | "pos" | "doviz" | "ekhesap";
  overdraftLimit?: number;
}

export type TransactionCategory =
  | "Tahsilat"
  | "Vergi & SGK"
  | "Tedarikçi"
  | "Kira"
  | "Maaş"
  | "Döviz"
  | "Virman"
  | "Eşleşmedi";

export type AccountingStatus = "Aktarıldı" | "Bekliyor" | "Hata";

export interface Transaction {
  id: string;
  bankId: BankId;
  accountId: string;
  date: string; // ISO timestamp
  counterparty: string;
  description: string;
  channel: "FAST" | "EFT" | "Havale" | "POS" | "Otomatik Talimat";
  reference?: string;
  category: TransactionCategory;
  amount: number; // signed
  balanceAfter: number;
  accountingStatus: AccountingStatus;
  flaggedAnomaly?: boolean;
}

export interface ConsentGrant {
  bankId: BankId;
  accountsCount: number;
  status: "active" | "expiring" | "expired";
  grantedAt: string;
  expiresAt: string;
  scopeLabel: string;
}

export interface PendingApproval {
  id: string;
  title: string;
  subtitle: string;
  bankId: BankId;
  amount: number;
  requestedBy: string;
  risky?: boolean;
}

export interface RecentPayment {
  id: string;
  bankId: BankId;
  recipient: string;
  channel: "FAST" | "EFT" | "Havale";
  time: string;
  amount: number;
  status: "Tamamlandı" | "Bankada" | "Reddedildi";
}

export interface PaymentLink {
  id: string;
  customer: string;
  invoiceRef: string;
  channel: "WhatsApp" | "e-posta" | "SMS";
  sentAt: string;
  amount: number;
  status: "Görüntülendi" | "Ödendi" | "Bekliyor" | "Süresi doldu";
}

export interface OverdueReceivable {
  id: string;
  customer: string;
  invoiceRef: string;
  daysOverdue: number;
  dueDate: string;
  amount: number;
  remindersSent: number;
}

export interface ReconciliationException {
  id: string;
  transactionId: string;
  bankId: BankId;
  accountTail: string;
  customer: string;
  date: string;
  description: string;
  amount: number;
  reasonHint: string;
  candidates: ReconciliationCandidate[];
}

export interface ReconciliationCandidate {
  id: string;
  label: string;
  detail: string;
  matchScore: number;
  amount: number;
}

export interface CashFlowPoint {
  date: string;
  incoming: number;
  outgoing: number;
}

export interface CashFlowForecastPoint {
  date: string;
  actual?: number;
  forecast?: number;
  bandLow?: number;
  bandHigh?: number;
}

export interface ExpectedCashItem {
  id: string;
  label: string;
  subLabel: string;
  amount: number;
  date: string;
}

export interface ReportPackage {
  id: string;
  period: string;
  status: "Mühürlü" | "Arşiv";
  summary: string;
  sha256: string;
  generatedAt: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  sector: string;
  bankCount: number;
  pendingExceptions: number;
  consentStatus: "Aktif" | "Uyarı" | "Süresi doldu";
  consentDetail?: string;
  lastSync: string;
}

export interface AssistantExchange {
  id: string;
  question: string;
  answeredAt: string;
  scannedAccounts: number;
  responseMs: number;
  answer: string;
  highlightAmount?: string;
  highlightNote?: string;
  rows: { date: string; channel: string; ref: string; amount: number }[];
}

export interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}
