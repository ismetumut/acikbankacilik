export type BankId = "ziraat" | "isbankasi" | "garanti" | "yapikredi";

export interface Bank {
  id: BankId;
  name: string;
  shortName: string;
  initials: string;
  colorHex: string;
}

export type Currency = "TRY" | "USD" | "EUR" | "GBP";

export interface Company {
  id: string;
  name: string;
  shortName: string;
  sector: string;
}

export interface Account {
  id: string;
  companyId: string;
  bankId: BankId;
  label: string;
  subLabel: string;
  iban: string;
  currency: Currency;
  balance: number;
  availableBalance: number;
  lastSync: string; // ISO timestamp
  kind: "vadesiz" | "pos" | "doviz" | "ekhesap";
  overdraftLimit?: number;
  blockedAmount?: number; // bloke / provizyon tutarı (PSD2 balance types)
}

/** Bankada kayıtlı lehdar (saved payee) — AIS ile okunur. */
export interface Beneficiary {
  id: string;
  name: string;
  iban: string;
  bankId: BankId;
  lastUsed?: string; // ISO
  trusted?: boolean;
}

/** Otomatik ödeme talimatı (DD mandası) — AIS okuması: hesaptan çekilen düzenli tahsilatlar. */
export interface DirectDebitMandate {
  id: string;
  creditor: string;
  reference: string;
  accountId: string;
  bankId: BankId;
  maxAmount: number;
  frequency: "weekly" | "monthly" | "yearly";
  nextCollection: string; // ISO
  status: "active" | "canceled";
}

/** Gelir doğrulama & harcanabilirlik içgörüsü — hareketlerden hesaplanır (Plaid/Tink tarzı). */
export interface IncomeInsight {
  monthlyAverageIncome: number;
  monthlyAverageExpense: number;
  recurringIncomeSources: { source: string; amount: number; count: number }[];
  affordabilityScore: number; // 0-100
  disposableMonthly: number;
  incomeStabilityLabel: "Düzenli" | "Değişken" | "Yetersiz veri";
  monthsAnalyzed: number;
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

export type ApprovalRole = "Düzenleyen" | "Kontrol eden" | "Onaycı";

export interface ApprovalStep {
  role: ApprovalRole;
  person: string;
  status: "Tamamlandı" | "Bekliyor";
}

export interface PendingApproval {
  id: string;
  title: string;
  subtitle: string;
  bankId: BankId;
  amount: number;
  requestedBy: string;
  risky?: boolean;
  chain: ApprovalStep[];
}

export interface ErpCari {
  id: string;
  name: string;
  iban: string;
  vergiNo?: string;
}

/** Açık ERP faturası — banka hareketiyle eşleştirilecek kayıt. */
export interface ErpInvoice {
  id: string;
  docNo: string; // "FTR-2026-1184"
  cariId: string;
  direction: "alacak" | "borc"; // alacak: müşteri bize öder (gelen) · borc: tedarikçiye öderiz (giden)
  amount: number; // pozitif tutar
  issueDate: string; // ISO
  dueDate: string; // ISO
  status: "open" | "matched";
}

/** Öğrenilen eşleme: bir gönderen/karşı tarafın kalıcı olarak bağlandığı cari. */
export interface ErpMapping {
  key: string; // normalize edilmiş karşı taraf anahtarı (isim veya IBAN)
  cariId: string;
  count: number; // kaç kez onaylandı
  updatedAt: string;
}

export type MatchSignal = "iban" | "reference" | "amount" | "name" | "date" | "learned" | "combo" | "balance";

/** Bir skorun neden verildiğini açıklayan tek gerekçe. */
export interface MatchReason {
  signal: MatchSignal;
  label: string; // "Fatura no 1184 açıklamada bulundu"
  positive: boolean;
}

export type MatchBand = "auto" | "review" | "manual";

/** Motorun ürettiği tek eşleşme adayı. */
export interface MatchCandidate {
  id: string;
  kind: "invoice" | "combo" | "balance";
  label: string;
  detail: string;
  amount: number;
  cariId?: string;
  invoiceIds: string[];
  score: number; // 0-100 güven
  band: MatchBand;
  reasons: MatchReason[];
}

/** Motora verilen banka hareketi (işaretli tutar: + gelen, - giden). */
export interface MatchInput {
  counterparty: string;
  description: string;
  amount: number;
  date: string;
  iban?: string;
}

/**
 * PIS ödeme durumu yaşam döngüsü — küresel Open Banking standardıyla hizalı
 * (created → submitted → AcceptedSettlementInProgress → completed / rejected).
 */
export type PisStatus =
  | "created" // Oluşturuldu
  | "pending_cop" // Alıcı doğrulanıyor (Confirmation of Payee)
  | "awaiting_approval" // Onay zincirinde bekliyor
  | "submitted" // Bankaya iletildi
  | "settling" // Takasta (AcceptedSettlementInProgress)
  | "completed" // Tamamlandı
  | "rejected" // Reddedildi
  | "failed"; // Başarısız

export interface PisStatusEvent {
  status: PisStatus;
  at: string; // ISO
  note?: string;
}

export interface RecentPayment {
  id: string;
  bankId: BankId;
  recipient: string;
  channel: "FAST" | "EFT" | "Havale";
  time: string;
  amount: number;
  status: "Tamamlandı" | "Bankada" | "Reddedildi"; // geriye dönük özet
  pisStatus?: PisStatus;
  statusHistory?: PisStatusEvent[];
  idempotencyKey?: string;
  copOutcome?: CopOutcome;
}

/**
 * Otomatik ödeme talimatı — planlı, tekrarlı (standing order), VRP (değişken tekrarlı)
 * ve sweep (hesaplar arası otomatik aktarım) tek modelde.
 */
export type RecurringKind = "scheduled" | "standing_order" | "vrp" | "sweep";
export type RecurringFrequency = "once" | "weekly" | "monthly";

export interface RecurringPayment {
  id: string;
  kind: RecurringKind;
  label: string;
  bankId: BankId;
  sourceAccountId: string;
  recipient: string;
  iban?: string;
  amount: number; // sabit tutar · VRP/sweep için üst sınır
  amountVariable?: boolean; // VRP: her seferinde değişebilir (amount = üst sınır)
  frequency: RecurringFrequency;
  nextRun: string; // ISO
  endDate?: string;
  status: "active" | "paused" | "completed";
  // VRP alanları
  vrpMaxPerPeriod?: number;
  vrpUsedThisPeriod?: number;
  // sweep alanları
  targetAccountId?: string;
  sweepKeepBalance?: number; // bu bakiyeyi tut, fazlasını hedefe aktar
  runsCount?: number;
  lastRunAt?: string;
  createdAt: string;
}

/** Confirmation of Payee — göndermeden önce alıcı adı/IBAN doğrulaması. */
export type CopOutcome = "match" | "close_match" | "no_match" | "unavailable";

export interface CopResult {
  outcome: CopOutcome;
  /** close_match/no_match durumunda bankadaki gerçek hesap adı önerisi. */
  suggestedName?: string;
  reason: string;
}

export type PaymentLinkChannel = "WhatsApp" | "e-posta" | "SMS" | "QR";

export interface PaymentLink {
  id: string;
  customer: string;
  invoiceRef: string;
  channel: PaymentLinkChannel;
  sentAt: string;
  amount: number;
  /** 0 = müşteri belirlesin (açık tutar). */
  amountOpen?: boolean;
  reusable?: boolean;
  validityLabel?: string;
  url?: string;
  status: "Görüntülendi" | "Ödendi" | "Bekliyor" | "Süresi doldu";
}

export type CardScheme = "Visa" | "Mastercard" | "Troy";

/** Result of a Bank Identification Number (first 6 digits) lookup. */
export interface BinInfo {
  bank: string;
  program: string;
  scheme: CardScheme;
  colorHex: string;
  /** Allowed installment counts beyond single charge (2, 3, 6, …). */
  installments: number[];
}

export interface CardCollection {
  id: string;
  maskedCard: string;
  bank: string;
  scheme: CardScheme;
  amount: number;
  installment: number; // 1 = tek çekim
  commission: number;
  net: number;
  reference: string;
  time: string;
  refunded?: boolean;
}

/** Banka ile öde (A2A / "Pay by bank") tahsilat talebi — kart yerine hesaptan-hesaba, anında ve düşük komisyon. */
export interface PayByBankRequest {
  id: string;
  customer: string;
  amount: number;
  invoiceRef?: string;
  status: "pending" | "paid" | "expired" | "refunded";
  createdAt: string;
  paidAt?: string;
  bankId?: BankId; // ödeme hangi bankadan geldi
  fee: number; // A2A komisyonu (karttan çok düşük)
  net: number;
}

/** Abonelik / tekrarlı tahsilat — VRP mandası veya kart ile düzenli otomatik tahsilat. */
export interface Subscription {
  id: string;
  customer: string;
  planLabel: string;
  amount: number;
  frequency: "weekly" | "monthly";
  status: "active" | "paused" | "canceled";
  method: "a2a" | "card";
  mandateRef: string; // VRP/DD mandası referansı
  nextCharge: string;
  collectedCount: number;
  createdAt: string;
}

/** POS hakediş / settlement partisi — kart tahsilatları T+1 toplu hesaba geçer. */
export interface SettlementBatch {
  id: string;
  bankId: BankId;
  valueDate: string; // ISO — hesaba geçtiği/geçeceği gün
  txnCount: number;
  gross: number;
  commission: number;
  net: number;
  status: "pending" | "settled";
  bankMatched: boolean; // banka ekstresiyle mutabık mı
}

/** Yaptırım / PEP taraması sonucu. */
export interface SanctionsResult {
  outcome: "clear" | "review" | "hit";
  matchedList?: string; // eşleşen liste (OFAC, EU, BM, PEP)
  reason: string;
}

export type RiskLevel = "low" | "medium" | "high";

/** Ödeme risk skoru — tutar, yeni alıcı, saat, yaptırım sinyalleriyle. */
export interface PaymentRisk {
  score: number; // 0-100
  level: RiskLevel;
  reasons: string[];
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
  counterpartyIban?: string; // karşı taraf IBAN'ı — eşleştirme motoru için güçlü sinyal
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
