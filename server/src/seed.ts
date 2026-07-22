import {
  ACCOUNTS,
  ASSISTANT_HISTORY,
  CASH_FLOW_30D,
  CASH_FLOW_FORECAST,
  CLIENTS,
  ERP_CARI_LIST,
  ERP_INVOICES,
  RECURRING_PAYMENTS,
  PAY_BY_BANK_REQUESTS,
  SUBSCRIPTIONS,
  BENEFICIARIES,
  DIRECT_DEBIT_MANDATES,
  SETTLEMENT_BATCHES,
  CONSENTS,
  EXPECTED_INCOMING,
  EXPECTED_OUTGOING,
  NOTIFICATION_SETTINGS,
  OVERDUE_RECEIVABLES,
  PAYMENT_LINKS,
  PENDING_APPROVALS,
  RECENT_CARD_COLLECTIONS,
  RECENT_PAYMENTS,
  RECONCILIATION_EXCEPTIONS,
  REPORT_PACKAGES,
  TRANSACTIONS,
} from "../../src/lib/mockData";
import { countUsers, hasCollection, insertUser, setCollection } from "./db";
import { hashPassword } from "./auth";

/** Collection keys used across the data layer and routes. */
export const KEYS = {
  accounts: "accounts",
  transactions: "transactions",
  consents: "consents",
  approvals: "approvals",
  payments: "payments",
  links: "links",
  cardCollections: "cardCollections",
  overdue: "overdue",
  reconciliation: "reconciliation",
  reports: "reports",
  notifications: "notifications",
  assistant: "assistant",
  clients: "clients",
  cashflow30d: "cashflow30d",
  cashflowForecast: "cashflowForecast",
  expectedIncoming: "expectedIncoming",
  expectedOutgoing: "expectedOutgoing",
  erpCari: "erpCari",
  erpInvoices: "erpInvoices",
  erpMappings: "erpMappings",
  recurring: "recurring",
  payByBank: "payByBank",
  subscriptions: "subscriptions",
  beneficiaries: "beneficiaries",
  directDebits: "directDebits",
  settlements: "settlements",
} as const;

/**
 * Populates the database from the bundled realistic dataset on first boot.
 * Idempotent: existing collections/users are left untouched so mutations persist
 * across restarts. Delete akort.db to reseed from scratch.
 */
export function runSeed(): void {
  const seedMap: Record<string, unknown[]> = {
    [KEYS.accounts]: ACCOUNTS,
    [KEYS.transactions]: TRANSACTIONS,
    [KEYS.consents]: CONSENTS,
    [KEYS.approvals]: PENDING_APPROVALS,
    [KEYS.payments]: RECENT_PAYMENTS,
    [KEYS.links]: PAYMENT_LINKS,
    [KEYS.cardCollections]: RECENT_CARD_COLLECTIONS,
    [KEYS.overdue]: OVERDUE_RECEIVABLES,
    [KEYS.reconciliation]: RECONCILIATION_EXCEPTIONS,
    [KEYS.reports]: REPORT_PACKAGES,
    [KEYS.notifications]: NOTIFICATION_SETTINGS,
    [KEYS.assistant]: ASSISTANT_HISTORY,
    [KEYS.clients]: CLIENTS,
    [KEYS.cashflow30d]: CASH_FLOW_30D,
    [KEYS.cashflowForecast]: CASH_FLOW_FORECAST,
    [KEYS.expectedIncoming]: EXPECTED_INCOMING,
    [KEYS.expectedOutgoing]: EXPECTED_OUTGOING,
    [KEYS.erpCari]: ERP_CARI_LIST,
    [KEYS.erpInvoices]: ERP_INVOICES,
    [KEYS.erpMappings]: [],
    [KEYS.recurring]: RECURRING_PAYMENTS,
    [KEYS.payByBank]: PAY_BY_BANK_REQUESTS,
    [KEYS.subscriptions]: SUBSCRIPTIONS,
    [KEYS.beneficiaries]: BENEFICIARIES,
    [KEYS.directDebits]: DIRECT_DEBIT_MANDATES,
    [KEYS.settlements]: SETTLEMENT_BATCHES,
  };

  // Statik/türetilmiş koleksiyonlar (kullanıcı mutasyonu yok) her açılışta tazelenir,
  // böylece veri şekli değişince (ör. 30→90 günlük nakit akışı) yeniden dağıtımda güncellenir.
  const REFRESH_KEYS = new Set<string>([
    KEYS.cashflow30d,
    KEYS.cashflowForecast,
    KEYS.erpCari,
    KEYS.erpInvoices,
    KEYS.beneficiaries,
    KEYS.directDebits,
    KEYS.reconciliation, // karşı taraf IBAN'ı + motor için tazelenir (erpMappings korunur)
  ]);

  let seededCollections = 0;
  for (const [key, value] of Object.entries(seedMap)) {
    if (!hasCollection(key) || REFRESH_KEYS.has(key)) {
      setCollection(key, value);
      seededCollections++;
    }
  }

  if (countUsers() === 0) {
    const pw = process.env.SEED_PASSWORD ?? "akort2026";
    const seedUsers = [
      { email: "ismetumut@gmail.com", name: "İsmet Umut" },
      { email: "demo@akort.app", name: "Demo Kullanıcı" },
    ];
    for (const u of seedUsers) {
      insertUser({
        id: `usr-${Math.random().toString(36).slice(2, 10)}`,
        email: u.email.toLowerCase(),
        password_hash: hashPassword(pw),
        name: u.name,
        role: "admin",
      });
    }
    console.log(`[seed] ${seedUsers.length} kullanıcı oluşturuldu · geçici şifre: ${pw}`);
  }

  if (seededCollections > 0) {
    console.log(`[seed] ${seededCollections} koleksiyon veritabanına yazıldı.`);
  }
}
