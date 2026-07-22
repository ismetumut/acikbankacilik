import type {
  Account,
  AssistantExchange,
  BankId,
  Beneficiary,
  CardCollection,
  DirectDebitMandate,
  IncomeInsight,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  ConsentGrant,
  CopResult,
  ErpCari,
  ErpInvoice,
  ErpMapping,
  NotificationSetting,
  OverdueReceivable,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  PayByBankRequest,
  RecentPayment,
  RecurringPayment,
  ReportPackage,
  SanctionsResult,
  SettlementBatch,
  Subscription,
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
  POS_COMMISSION,
  RECENT_CARD_COLLECTIONS,
  RECENT_PAYMENTS,
  RECONCILIATION_EXCEPTIONS,
  RECURRING_PAYMENTS,
  PAY_BY_BANK_REQUESTS,
  SUBSCRIPTIONS,
  BENEFICIARIES,
  DIRECT_DEBIT_MANDATES,
  SETTLEMENT_BATCHES,
  ERP_CARI_LIST,
  ERP_INVOICES,
  REPORT_PACKAGES,
  TRANSACTIONS,
  bankOf,
  lookupBin,
} from "@/lib/mockData";
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
import { confirmPayee, simulateStatus, toLegacyStatus } from "@/lib/pis";
import { nextRunDate } from "@/lib/recurring";
import { computeIncomeInsights } from "@/lib/insights";
import { screenSanctions } from "@/lib/risk";

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
let cardCollections = [...RECENT_CARD_COLLECTIONS];
const overdueReceivables = [...OVERDUE_RECEIVABLES];
let reconciliationExceptions = [...RECONCILIATION_EXCEPTIONS];
let erpMappings: ErpMapping[] = [];
let recurringPayments = [...RECURRING_PAYMENTS];
let payByBankRequests = [...PAY_BY_BANK_REQUESTS];
let subscriptions = [...SUBSCRIPTIONS];
let reportPackages = [...REPORT_PACKAGES];
let notificationSettings = [...NOTIFICATION_SETTINGS];
let assistantHistory = [...ASSISTANT_HISTORY];

export class MockBankingProvider implements BankingProvider {
  async getAccounts(companyId?: string): Promise<Account[]> {
    if (!companyId || companyId === ALL_COMPANIES) return delay(accounts);
    return delay(accounts.filter((a) => a.companyId === companyId));
  }

  async getBeneficiaries(): Promise<Beneficiary[]> {
    return delay([...BENEFICIARIES]);
  }
  async getDirectDebitMandates(): Promise<DirectDebitMandate[]> {
    return delay([...DIRECT_DEBIT_MANDATES]);
  }
  async getIncomeInsights(): Promise<IncomeInsight> {
    return delay(computeIncomeInsights(transactions, CASH_FLOW_30D));
  }

  async getSettlements(): Promise<SettlementBatch[]> {
    return delay([...SETTLEMENT_BATCHES]);
  }
  async screenPayee(name: string): Promise<SanctionsResult> {
    return delay(screenSanctions(name), 350);
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
    if (!approval) {
      await delay(undefined, 200);
      return;
    }

    if (decision === "reject") {
      pendingApprovals = pendingApprovals.filter((a) => a.id !== id);
      await delay(undefined, 350);
      return;
    }

    const nextIdx = approval.chain.findIndex((s) => s.status === "Bekliyor");
    const updatedChain = approval.chain.map((s, i) => (i === nextIdx ? { ...s, status: "Tamamlandı" as const } : s));
    const stillPending = updatedChain.some((s) => s.status === "Bekliyor");

    if (!stillPending) {
      pendingApprovals = pendingApprovals.filter((a) => a.id !== id);
      recentPayments = [
        {
          id: `pay-${Date.now()}`,
          bankId: approval.bankId,
          recipient: approval.title,
          channel: "FAST",
          time: "şimdi",
          amount: approval.amount,
          status: "Bankada",
          pisStatus: "submitted",
          statusHistory: [
            { status: "awaiting_approval", at: new Date().toISOString() },
            { status: "submitted", at: new Date().toISOString(), note: "Onay zinciri tamamlandı, bankaya iletildi" },
          ],
        },
        ...recentPayments,
      ];
    } else {
      pendingApprovals = pendingApprovals.map((a) => (a.id === id ? { ...a, chain: updatedChain } : a));
    }
    await delay(undefined, 350);
  }

  async submitPaymentBatch(input: PaymentBatchInput): Promise<PendingApproval[]> {
    const created: PendingApproval[] = input.lines.map((line, i) => {
      const account = accounts.find((a) => a.id === line.sourceAccountId);
      return {
        id: `appr-${Date.now()}-${i}`,
        title: line.recipient,
        subtitle: `${account ? bankOf(account.bankId).shortName : ""} · ${line.channel}${line.description ? " · " + line.description : ""}`,
        bankId: account?.bankId ?? "ziraat",
        amount: line.amount,
        requestedBy: input.chain[0]?.person ?? "Selin Demir",
        chain: input.chain.map((c, idx) => ({
          role: c.role,
          person: c.person,
          status: idx === 0 ? ("Tamamlandı" as const) : ("Bekliyor" as const),
        })),
      };
    });
    pendingApprovals = [...created, ...pendingApprovals];
    await delay(undefined, 500);
    return created;
  }

  async getRecentPayments(): Promise<RecentPayment[]> {
    // Bankaya iletilen ödemelerin durumunu zamanla ilerlet (submitted→settling→completed).
    recentPayments = recentPayments.map((p) => {
      if (!p.pisStatus || !["submitted", "settling"].includes(p.pisStatus)) return p;
      const submittedAt = p.statusHistory?.find((e) => e.status === "submitted")?.at;
      if (!submittedAt) return p;
      const next = simulateStatus(submittedAt);
      if (next === p.pisStatus) return p;
      return {
        ...p,
        pisStatus: next,
        status: toLegacyStatus(next),
        statusHistory: [...(p.statusHistory ?? []), { status: next, at: new Date().toISOString() }],
      };
    });
    return delay(recentPayments);
  }

  async createPayment(input: NewPaymentInput): Promise<RecentPayment> {
    // Idempotency: aynı anahtarla gelen ödeme tekrarlanmaz.
    if (input.idempotencyKey) {
      const existing = recentPayments.find((p) => p.idempotencyKey === input.idempotencyKey);
      if (existing) return delay(existing, 120);
    }
    const account = accounts.find((a) => a.id === input.sourceAccountId);
    const now = new Date().toISOString();
    const payment: RecentPayment = {
      id: `pay-${Date.now()}`,
      bankId: account?.bankId ?? "ziraat",
      recipient: input.recipient,
      channel: input.channel,
      time: "şimdi",
      amount: input.amount,
      status: "Bankada",
      pisStatus: "submitted",
      idempotencyKey: input.idempotencyKey,
      statusHistory: [
        { status: "created", at: now },
        { status: "submitted", at: now, note: `${input.channel} ile bankaya iletildi` },
      ],
    };
    recentPayments = [payment, ...recentPayments];
    await delay(undefined, 500);
    return payment;
  }

  async confirmPayee(input: { iban: string; name: string }): Promise<CopResult> {
    return delay(confirmPayee(input.iban, input.name, [...ERP_CARI_LIST]), 400);
  }

  async getRecurringPayments(): Promise<RecurringPayment[]> {
    return delay([...recurringPayments]);
  }

  async createRecurringPayment(input: NewRecurringInput): Promise<RecurringPayment> {
    const account = accounts.find((a) => a.id === input.sourceAccountId);
    const created: RecurringPayment = {
      id: `rec-${Date.now()}`,
      kind: input.kind,
      label: input.label,
      bankId: account?.bankId ?? "ziraat",
      sourceAccountId: input.sourceAccountId,
      recipient: input.recipient,
      iban: input.iban,
      amount: input.amount,
      amountVariable: input.amountVariable,
      frequency: input.frequency,
      nextRun: input.firstRun,
      endDate: input.endDate,
      status: "active",
      vrpMaxPerPeriod: input.vrpMaxPerPeriod,
      vrpUsedThisPeriod: input.kind === "vrp" ? 0 : undefined,
      targetAccountId: input.targetAccountId,
      sweepKeepBalance: input.sweepKeepBalance,
      runsCount: 0,
      createdAt: new Date().toISOString(),
    };
    recurringPayments = [created, ...recurringPayments];
    await delay(undefined, 400);
    return created;
  }

  async setRecurringStatus(id: string, status: "active" | "paused" | "completed"): Promise<void> {
    recurringPayments = recurringPayments.map((r) => (r.id === id ? { ...r, status } : r));
    await delay(undefined, 200);
  }

  async runRecurringNow(id: string): Promise<void> {
    const rp = recurringPayments.find((r) => r.id === id);
    if (!rp) return;
    const now = new Date().toISOString();
    const amount = rp.kind === "sweep" ? 42_000 : rp.amount;
    recentPayments = [
      {
        id: `pay-${Date.now()}`,
        bankId: rp.bankId,
        recipient: rp.kind === "sweep" ? `Sweep → ${rp.recipient}` : rp.recipient,
        channel: "FAST",
        time: "şimdi",
        amount,
        status: "Bankada",
        pisStatus: "submitted",
        statusHistory: [
          { status: "created", at: now, note: `${rp.label} otomatik talimatı tetiklendi` },
          { status: "submitted", at: now },
        ],
      },
      ...recentPayments,
    ];
    recurringPayments = recurringPayments.map((r) =>
      r.id === id
        ? {
            ...r,
            runsCount: (r.runsCount ?? 0) + 1,
            lastRunAt: now,
            status: r.frequency === "once" ? ("completed" as const) : r.status,
            nextRun: r.frequency === "once" ? r.nextRun : nextRunDate(r.nextRun, r.frequency),
            vrpUsedThisPeriod: r.kind === "vrp" ? (r.vrpUsedThisPeriod ?? 0) + amount : r.vrpUsedThisPeriod,
          }
        : r,
    );
    await delay(undefined, 400);
  }

  async getPaymentLinks(): Promise<PaymentLink[]> {
    return delay(paymentLinks);
  }

  async createPaymentLink(input: NewPaymentLinkInput): Promise<PaymentLink> {
    const slug = input.customer.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 24) || "tahsilat";
    const link: PaymentLink = {
      id: `link-${Date.now()}`,
      customer: input.customer,
      invoiceRef: input.invoiceRef || `FTR-2026-${Math.floor(1000 + Math.random() * 900)}`,
      channel: input.channel,
      sentAt: input.output === "qr" ? "QR oluşturuldu" : "şimdi gönderildi",
      amount: input.amount,
      amountOpen: input.amountOpen,
      reusable: input.reusable,
      validityLabel: input.validityLabel,
      url: `akort.link/${slug}-${Math.floor(1000 + Math.random() * 8999)}`,
      status: "Bekliyor",
    };
    paymentLinks = [link, ...paymentLinks];
    await delay(undefined, 450);
    return link;
  }

  async takeCardPayment(input: CardPaymentInput): Promise<CardPaymentResult> {
    const bin = lookupBin(input.cardNumber);
    const rate = input.installment > 1 ? POS_COMMISSION.installment : POS_COMMISSION.single;
    const commission = Math.round(input.amount * rate);
    const net = input.amount - commission;
    const digits = input.cardNumber.replace(/\D/g, "");
    const masked = `${digits.slice(0, 6)}** **** ${digits.slice(-4)}`.replace(/(.{4})/g, "$1 ").trim();
    const collection: CardCollection = {
      id: `cc-${Date.now()}`,
      maskedCard: masked,
      bank: bin?.bank ?? "Bilinmeyen banka",
      scheme: bin?.scheme ?? "Visa",
      amount: input.amount,
      installment: input.installment,
      commission,
      net,
      reference: `POS-2026-${Math.floor(1000 + Math.random() * 8999)}`,
      time: "şimdi",
    };
    cardCollections = [collection, ...cardCollections];
    await delay(undefined, 600);
    return {
      reference: collection.reference,
      approved: true,
      bank: collection.bank,
      amount: input.amount,
      installment: input.installment,
      commission,
      net,
    };
  }

  async getRecentCardCollections(): Promise<CardCollection[]> {
    return delay(cardCollections);
  }

  async refundCardCollection(id: string): Promise<void> {
    cardCollections = cardCollections.map((c) => (c.id === id ? { ...c, refunded: true } : c));
    await delay(undefined, 300);
  }

  async getPayByBankRequests(): Promise<PayByBankRequest[]> {
    return delay([...payByBankRequests]);
  }
  async createPayByBankRequest(input: NewPayByBankInput): Promise<PayByBankRequest> {
    const fee = Math.round(input.amount * 0.003);
    const req: PayByBankRequest = {
      id: `a2a-${Date.now()}`,
      customer: input.customer,
      amount: input.amount,
      invoiceRef: input.invoiceRef,
      status: "pending",
      createdAt: new Date().toISOString(),
      fee,
      net: input.amount - fee,
    };
    payByBankRequests = [req, ...payByBankRequests];
    await delay(undefined, 400);
    return req;
  }
  async markPayByBankPaid(id: string): Promise<void> {
    const now = new Date().toISOString();
    payByBankRequests = payByBankRequests.map((r) =>
      r.id === id ? { ...r, status: "paid" as const, paidAt: now, bankId: "garanti" as const } : r,
    );
    await delay(undefined, 300);
  }
  async refundPayByBank(id: string): Promise<void> {
    payByBankRequests = payByBankRequests.map((r) => (r.id === id ? { ...r, status: "refunded" as const } : r));
    await delay(undefined, 300);
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return delay([...subscriptions]);
  }
  async createSubscription(input: NewSubscriptionInput): Promise<Subscription> {
    const sub: Subscription = {
      id: `sub-${Date.now()}`,
      customer: input.customer,
      planLabel: input.planLabel,
      amount: input.amount,
      frequency: input.frequency,
      status: "active",
      method: input.method,
      mandateRef: `VRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      nextCharge: input.firstCharge,
      collectedCount: 0,
      createdAt: new Date().toISOString(),
    };
    subscriptions = [sub, ...subscriptions];
    await delay(undefined, 400);
    return sub;
  }
  async chargeSubscriptionNow(id: string): Promise<void> {
    const sub = subscriptions.find((s) => s.id === id);
    if (!sub) return;
    const now = new Date().toISOString();
    const fee = Math.round(sub.amount * 0.003);
    payByBankRequests = [
      {
        id: `a2a-${Date.now()}`,
        customer: sub.customer,
        amount: sub.amount,
        invoiceRef: sub.mandateRef,
        status: "paid",
        createdAt: now,
        paidAt: now,
        bankId: "isbankasi",
        fee,
        net: sub.amount - fee,
      },
      ...payByBankRequests,
    ];
    subscriptions = subscriptions.map((s) =>
      s.id === id ? { ...s, collectedCount: s.collectedCount + 1, nextCharge: nextRunDate(s.nextCharge, s.frequency) } : s,
    );
    await delay(undefined, 400);
  }
  async setSubscriptionStatus(id: string, status: "active" | "paused" | "canceled"): Promise<void> {
    subscriptions = subscriptions.map((s) => (s.id === id ? { ...s, status } : s));
    await delay(undefined, 200);
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

  async getErpCariList(): Promise<ErpCari[]> {
    return delay([...ERP_CARI_LIST]);
  }
  async getErpInvoices(): Promise<ErpInvoice[]> {
    return delay([...ERP_INVOICES]);
  }
  async getErpMappings(): Promise<ErpMapping[]> {
    return delay([...erpMappings]);
  }
  async saveErpMapping(key: string, cariId: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = erpMappings.find((m) => m.key === key);
    if (existing) {
      erpMappings = erpMappings.map((m) => (m.key === key ? { ...m, cariId, count: m.count + 1, updatedAt: now } : m));
    } else {
      erpMappings = [...erpMappings, { key, cariId, count: 1, updatedAt: now }];
    }
    await delay(undefined, 200);
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
