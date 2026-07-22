import { Router } from "express";
import type {
  Account,
  ApiKey,
  AssistantExchange,
  CardCollection,
  CashFlowPoint,
  WebhookDelivery,
  WebhookSubscription,
  ConsentGrant,
  ErpCari,
  ErpMapping,
  NotificationSetting,
  PayByBankRequest,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  RecentPayment,
  RecurringPayment,
  ReportPackage,
  Subscription,
  Transaction,
} from "../../src/lib/types";
import {
  ALL_COMPANIES,
  DEMO_NOW,
  POS_COMMISSION,
  bankOf,
  lookupBin,
} from "../../src/lib/mockData";
import { confirmPayee, simulateStatus, toLegacyStatus } from "../../src/lib/pis";
import { nextRunDate } from "../../src/lib/recurring";
import { computeIncomeInsights } from "../../src/lib/insights";
import { screenSanctions } from "../../src/lib/risk";
import { getCollection, setCollection, findUserByEmail } from "./db";
import { KEYS } from "./seed";
import { requireAuth, signToken, verifyPassword, type AuthedRequest } from "./auth";

export const apiRouter = Router();

/* ---------------------------------------------------------------- auth ---- */

apiRouter.post("/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "E-posta ve şifre gerekli." });
  }
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "E-posta veya şifre hatalı." });
  }
  const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
  return res.json({ token: signToken(payload), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// Everything below requires a valid token.
apiRouter.use(requireAuth);

apiRouter.get("/auth/me", (req: AuthedRequest, res) => {
  const u = req.user!;
  res.json({ id: u.sub, email: u.email, name: u.name, role: u.role });
});

/* ------------------------------------------------------------ accounts ---- */

apiRouter.get("/accounts", (req, res) => {
  const companyId = req.query.companyId as string | undefined;
  const accounts = getCollection<Account>(KEYS.accounts);
  if (!companyId || companyId === ALL_COMPANIES) return res.json(accounts);
  res.json(accounts.filter((a) => a.companyId === companyId));
});

/* -------------------------------------------------------- transactions ---- */

apiRouter.get("/transactions", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const bankId = req.query.bankId as string | undefined;
  const category = req.query.category as string | undefined;
  const search = (req.query.search as string | undefined)?.toLowerCase();
  const hideVirman = req.query.hideVirman === "true";
  const companyId = req.query.companyId as string | undefined;

  let items = getCollection<Transaction>(KEYS.transactions);
  if (companyId && companyId !== ALL_COMPANIES) {
    const scoped = new Set(
      getCollection<Account>(KEYS.accounts).filter((a) => a.companyId === companyId).map((a) => a.id),
    );
    items = items.filter((t) => scoped.has(t.accountId));
  }
  if (bankId) items = items.filter((t) => t.bankId === bankId);
  if (category) items = items.filter((t) => t.category === category);
  if (hideVirman) items = items.filter((t) => t.category !== "Virman");
  if (search) {
    items = items.filter(
      (t) =>
        t.counterparty.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        (t.reference?.toLowerCase().includes(search) ?? false),
    );
  }
  const total = items.length;
  const start = (page - 1) * pageSize;
  res.json({ items: items.slice(start, start + pageSize), total, page, pageSize });
});

/* ------------------------------------------------------------ consents ---- */

apiRouter.get("/consents", (_req, res) => res.json(getCollection<ConsentGrant>(KEYS.consents)));

apiRouter.post("/consents/:bankId/renew", (req, res) => {
  const bankId = req.params.bankId;
  const expiresAt = new Date(DEMO_NOW.getTime() + 1000 * 60 * 60 * 24 * 180).toISOString();
  const consents = getCollection<ConsentGrant>(KEYS.consents).map((c) =>
    c.bankId === bankId ? { ...c, status: "active" as const, expiresAt } : c,
  );
  setCollection(KEYS.consents, consents);
  res.json({ ok: true });
});

/* ----------------------------------------------------------- approvals ---- */

apiRouter.get("/approvals", (_req, res) => res.json(getCollection<PendingApproval>(KEYS.approvals)));

apiRouter.post("/approvals/:id/decide", (req, res) => {
  const { id } = req.params;
  const decision = req.body?.decision as "approve" | "reject";
  let approvals = getCollection<PendingApproval>(KEYS.approvals);
  const approval = approvals.find((a) => a.id === id);
  if (!approval) return res.json({ ok: true });

  if (decision === "reject") {
    setCollection(KEYS.approvals, approvals.filter((a) => a.id !== id));
    return res.json({ ok: true });
  }

  const nextIdx = approval.chain.findIndex((s) => s.status === "Bekliyor");
  const updatedChain = approval.chain.map((s, i) => (i === nextIdx ? { ...s, status: "Tamamlandı" as const } : s));
  const stillPending = updatedChain.some((s) => s.status === "Bekliyor");

  if (!stillPending) {
    approvals = approvals.filter((a) => a.id !== id);
    setCollection(KEYS.approvals, approvals);
    const payments = getCollection<RecentPayment>(KEYS.payments);
    const now = new Date().toISOString();
    setCollection(KEYS.payments, [
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
          { status: "awaiting_approval", at: now },
          { status: "submitted", at: now, note: "Onay zinciri tamamlandı, bankaya iletildi" },
        ],
      },
      ...payments,
    ]);
  } else {
    setCollection(
      KEYS.approvals,
      approvals.map((a) => (a.id === id ? { ...a, chain: updatedChain } : a)),
    );
  }
  res.json({ ok: true });
});

interface PaymentLineInput {
  sourceAccountId: string;
  recipient: string;
  iban: string;
  amount: number;
  description: string;
  channel: "FAST" | "EFT" | "Havale";
}

apiRouter.post("/approvals/batch", (req, res) => {
  const lines = (req.body?.lines ?? []) as PaymentLineInput[];
  const chain = (req.body?.chain ?? []) as { role: string; person: string }[];
  const accounts = getCollection<Account>(KEYS.accounts);
  const created: PendingApproval[] = lines.map((line, i) => {
    const account = accounts.find((a) => a.id === line.sourceAccountId);
    return {
      id: `appr-${Date.now()}-${i}`,
      title: line.recipient,
      subtitle: `${account ? bankOf(account.bankId).shortName : ""} · ${line.channel}${line.description ? " · " + line.description : ""}`,
      bankId: account?.bankId ?? "ziraat",
      amount: line.amount,
      requestedBy: chain[0]?.person ?? "Selin Demir",
      chain: chain.map((c, idx) => ({
        role: c.role as PendingApproval["chain"][number]["role"],
        person: c.person,
        status: idx === 0 ? ("Tamamlandı" as const) : ("Bekliyor" as const),
      })),
    };
  });
  setCollection(KEYS.approvals, [...created, ...getCollection<PendingApproval>(KEYS.approvals)]);
  res.json(created);
});

/* ------------------------------------------------------------ payments ---- */

apiRouter.get("/payments", (_req, res) => {
  // Bankaya iletilen ödemelerin durumunu zamanla ilerlet (submitted→settling→completed).
  const list = getCollection<RecentPayment>(KEYS.payments).map((p) => {
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
  setCollection(KEYS.payments, list);
  res.json(list);
});

// Confirmation of Payee: göndermeden önce alıcı adı/IBAN doğrulaması.
apiRouter.post("/payments/confirm-payee", (req, res) => {
  const { iban, name } = (req.body ?? {}) as { iban?: string; name?: string };
  if (!iban || !name) return res.status(400).json({ error: "iban ve name zorunlu" });
  res.json(confirmPayee(iban, name, getCollection<ErpCari>(KEYS.erpCari)));
});

apiRouter.post("/payments", (req, res) => {
  const input = req.body ?? {};
  // Idempotency: aynı anahtarla gelen ödeme tekrarlanmaz.
  if (input.idempotencyKey) {
    const existing = getCollection<RecentPayment>(KEYS.payments).find((p) => p.idempotencyKey === input.idempotencyKey);
    if (existing) return res.json(existing);
  }
  const account = getCollection<Account>(KEYS.accounts).find((a) => a.id === input.sourceAccountId);
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
  setCollection(KEYS.payments, [payment, ...getCollection<RecentPayment>(KEYS.payments)]);
  res.json(payment);
});

/* ----------------------------------------------------------- recurring ---- */

apiRouter.get("/recurring", (_req, res) => res.json(getCollection<RecurringPayment>(KEYS.recurring)));

apiRouter.post("/recurring", (req, res) => {
  const input = req.body ?? {};
  const account = getCollection<Account>(KEYS.accounts).find((a) => a.id === input.sourceAccountId);
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
  setCollection(KEYS.recurring, [created, ...getCollection<RecurringPayment>(KEYS.recurring)]);
  res.json(created);
});

apiRouter.post("/recurring/:id/status", (req, res) => {
  const { status } = (req.body ?? {}) as { status?: string };
  const list = getCollection<RecurringPayment>(KEYS.recurring).map((r) =>
    r.id === req.params.id ? { ...r, status: status as RecurringPayment["status"] } : r,
  );
  setCollection(KEYS.recurring, list);
  res.json({ ok: true });
});

apiRouter.post("/recurring/:id/run", (req, res) => {
  const list = getCollection<RecurringPayment>(KEYS.recurring);
  const rp = list.find((r) => r.id === req.params.id);
  if (!rp) return res.json({ ok: true });
  const now = new Date().toISOString();
  const amount = rp.kind === "sweep" ? 42_000 : rp.amount;
  setCollection(KEYS.payments, [
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
    ...getCollection<RecentPayment>(KEYS.payments),
  ]);
  setCollection(
    KEYS.recurring,
    list.map((r) =>
      r.id === rp.id
        ? {
            ...r,
            runsCount: (r.runsCount ?? 0) + 1,
            lastRunAt: now,
            status: r.frequency === "once" ? ("completed" as const) : r.status,
            nextRun: r.frequency === "once" ? r.nextRun : nextRunDate(r.nextRun, r.frequency),
            vrpUsedThisPeriod: r.kind === "vrp" ? (r.vrpUsedThisPeriod ?? 0) + amount : r.vrpUsedThisPeriod,
          }
        : r,
    ),
  );
  res.json({ ok: true });
});

/* ------------------------------------------------------- pay by bank (A2A) */

apiRouter.get("/pay-by-bank", (_req, res) => res.json(getCollection<PayByBankRequest>(KEYS.payByBank)));

apiRouter.post("/pay-by-bank", (req, res) => {
  const { customer, amount, invoiceRef } = (req.body ?? {}) as { customer?: string; amount?: number; invoiceRef?: string };
  const amt = Number(amount) || 0;
  const fee = Math.round(amt * 0.003);
  const created: PayByBankRequest = {
    id: `a2a-${Date.now()}`,
    customer: customer ?? "",
    amount: amt,
    invoiceRef,
    status: "pending",
    createdAt: new Date().toISOString(),
    fee,
    net: amt - fee,
  };
  setCollection(KEYS.payByBank, [created, ...getCollection<PayByBankRequest>(KEYS.payByBank)]);
  res.json(created);
});

apiRouter.post("/pay-by-bank/:id/pay", (req, res) => {
  const now = new Date().toISOString();
  const list = getCollection<PayByBankRequest>(KEYS.payByBank).map((r) =>
    r.id === req.params.id ? { ...r, status: "paid" as const, paidAt: now, bankId: "garanti" as const } : r,
  );
  setCollection(KEYS.payByBank, list);
  res.json({ ok: true });
});

apiRouter.post("/pay-by-bank/:id/refund", (req, res) => {
  const list = getCollection<PayByBankRequest>(KEYS.payByBank).map((r) =>
    r.id === req.params.id ? { ...r, status: "refunded" as const } : r,
  );
  setCollection(KEYS.payByBank, list);
  res.json({ ok: true });
});

/* ---------------------------------------------------------- subscriptions -- */

apiRouter.get("/subscriptions", (_req, res) => res.json(getCollection<Subscription>(KEYS.subscriptions)));

apiRouter.post("/subscriptions", (req, res) => {
  const input = req.body ?? {};
  const created: Subscription = {
    id: `sub-${Date.now()}`,
    customer: input.customer,
    planLabel: input.planLabel,
    amount: Number(input.amount) || 0,
    frequency: input.frequency,
    status: "active",
    method: input.method,
    mandateRef: `VRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    nextCharge: input.firstCharge,
    collectedCount: 0,
    createdAt: new Date().toISOString(),
  };
  setCollection(KEYS.subscriptions, [created, ...getCollection<Subscription>(KEYS.subscriptions)]);
  res.json(created);
});

apiRouter.post("/subscriptions/:id/charge", (req, res) => {
  const subs = getCollection<Subscription>(KEYS.subscriptions);
  const sub = subs.find((s) => s.id === req.params.id);
  if (!sub) return res.json({ ok: true });
  const now = new Date().toISOString();
  const fee = Math.round(sub.amount * 0.003);
  setCollection(KEYS.payByBank, [
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
    ...getCollection<PayByBankRequest>(KEYS.payByBank),
  ]);
  setCollection(
    KEYS.subscriptions,
    subs.map((s) =>
      s.id === sub.id ? { ...s, collectedCount: s.collectedCount + 1, nextCharge: nextRunDate(s.nextCharge, s.frequency) } : s,
    ),
  );
  res.json({ ok: true });
});

apiRouter.post("/subscriptions/:id/status", (req, res) => {
  const { status } = (req.body ?? {}) as { status?: string };
  const list = getCollection<Subscription>(KEYS.subscriptions).map((s) =>
    s.id === req.params.id ? { ...s, status: status as Subscription["status"] } : s,
  );
  setCollection(KEYS.subscriptions, list);
  res.json({ ok: true });
});

/* -------------------------------------------------------- payment links --- */

apiRouter.get("/payment-links", (_req, res) => res.json(getCollection<PaymentLink>(KEYS.links)));

apiRouter.post("/payment-links", (req, res) => {
  const input = req.body ?? {};
  const slug = String(input.customer ?? "").toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 24) || "tahsilat";
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
  setCollection(KEYS.links, [link, ...getCollection<PaymentLink>(KEYS.links)]);
  res.json(link);
});

apiRouter.get("/overdue", (_req, res) => res.json(getCollection(KEYS.overdue)));

/* ------------------------------------------------------- card payments ---- */

apiRouter.post("/card-payment", (req, res) => {
  const input = req.body ?? {};
  const bin = lookupBin(String(input.cardNumber ?? ""));
  const installment = Number(input.installment ?? 1);
  const amount = Number(input.amount ?? 0);
  const rate = installment > 1 ? POS_COMMISSION.installment : POS_COMMISSION.single;
  const commission = Math.round(amount * rate);
  const net = amount - commission;
  const digits = String(input.cardNumber ?? "").replace(/\D/g, "");
  const masked = `${digits.slice(0, 6)}** **** ${digits.slice(-4)}`.replace(/(.{4})/g, "$1 ").trim();
  const collection: CardCollection = {
    id: `cc-${Date.now()}`,
    maskedCard: masked,
    bank: bin?.bank ?? "Bilinmeyen banka",
    scheme: bin?.scheme ?? "Visa",
    amount,
    installment,
    commission,
    net,
    reference: `POS-2026-${Math.floor(1000 + Math.random() * 8999)}`,
    time: "şimdi",
  };
  setCollection(KEYS.cardCollections, [collection, ...getCollection<CardCollection>(KEYS.cardCollections)]);
  res.json({
    reference: collection.reference,
    approved: true,
    bank: collection.bank,
    amount,
    installment,
    commission,
    net,
  });
});

apiRouter.get("/card-collections", (_req, res) => res.json(getCollection<CardCollection>(KEYS.cardCollections)));

apiRouter.post("/card-collections/:id/refund", (req, res) => {
  const list = getCollection<CardCollection>(KEYS.cardCollections).map((c) =>
    c.id === req.params.id ? { ...c, refunded: true } : c,
  );
  setCollection(KEYS.cardCollections, list);
  res.json({ ok: true });
});

/* ------------------------------------------------------ reconciliation ---- */

apiRouter.get("/reconciliation", (_req, res) =>
  res.json(getCollection<ReconciliationException>(KEYS.reconciliation)),
);

apiRouter.post("/reconciliation/:id/match", (req, res) => {
  const remaining = getCollection<ReconciliationException>(KEYS.reconciliation).filter((e) => e.id !== req.params.id);
  setCollection(KEYS.reconciliation, remaining);
  res.json({ ok: true });
});

/* ------------------------------------------------------ developer platform */

apiRouter.get("/dev/api-keys", (_req, res) => res.json(getCollection<ApiKey>(KEYS.apiKeys)));

apiRouter.post("/dev/api-keys", (req, res) => {
  const { name, environment, scopes } = (req.body ?? {}) as { name?: string; environment?: ApiKey["environment"]; scopes?: string[] };
  const tag = environment === "production" ? "live" : "test";
  const rand = Math.random().toString(36).slice(2, 10);
  const secret = `ak_${tag}_${rand}${Math.random().toString(36).slice(2, 12)}`;
  const key: ApiKey = {
    id: `key-${Date.now()}`,
    name: name ?? "Anahtar",
    prefix: `ak_${tag}_${rand.slice(0, 4)}••••`,
    environment: environment ?? "sandbox",
    scopes: scopes ?? [],
    createdAt: new Date().toISOString(),
  };
  setCollection(KEYS.apiKeys, [key, ...getCollection<ApiKey>(KEYS.apiKeys)]);
  res.json({ key, secret });
});

apiRouter.post("/dev/api-keys/:id/revoke", (req, res) => {
  setCollection(
    KEYS.apiKeys,
    getCollection<ApiKey>(KEYS.apiKeys).map((k) => (k.id === req.params.id ? { ...k, revoked: true } : k)),
  );
  res.json({ ok: true });
});

apiRouter.get("/dev/webhooks", (_req, res) => res.json(getCollection<WebhookSubscription>(KEYS.webhooks)));

apiRouter.post("/dev/webhooks", (req, res) => {
  const { url, events } = (req.body ?? {}) as { url?: string; events?: WebhookSubscription["events"] };
  const wh: WebhookSubscription = {
    id: `wh-${Date.now()}`,
    url: url ?? "",
    events: events ?? [],
    secretMasked: `whsec_${Math.random().toString(36).slice(2, 6)}••••`,
    active: true,
    createdAt: new Date().toISOString(),
  };
  setCollection(KEYS.webhooks, [wh, ...getCollection<WebhookSubscription>(KEYS.webhooks)]);
  res.json(wh);
});

apiRouter.post("/dev/webhooks/:id/active", (req, res) => {
  const { active } = (req.body ?? {}) as { active?: boolean };
  setCollection(
    KEYS.webhooks,
    getCollection<WebhookSubscription>(KEYS.webhooks).map((w) => (w.id === req.params.id ? { ...w, active: !!active } : w)),
  );
  res.json({ ok: true });
});

apiRouter.delete("/dev/webhooks/:id", (req, res) => {
  setCollection(
    KEYS.webhooks,
    getCollection<WebhookSubscription>(KEYS.webhooks).filter((w) => w.id !== req.params.id),
  );
  res.json({ ok: true });
});

apiRouter.get("/dev/webhook-deliveries", (_req, res) => res.json(getCollection<WebhookDelivery>(KEYS.webhookDeliveries)));

apiRouter.post("/dev/webhook-deliveries/:id/redeliver", (req, res) => {
  const now = new Date().toISOString();
  setCollection(
    KEYS.webhookDeliveries,
    getCollection<WebhookDelivery>(KEYS.webhookDeliveries).map((d) =>
      d.id === req.params.id ? { ...d, status: "success" as const, statusCode: 200, attempts: d.attempts + 1, at: now } : d,
    ),
  );
  res.json({ ok: true });
});

/* --------------------------------------------------- settlement & uyum ---- */

apiRouter.get("/settlements", (_req, res) => res.json(getCollection(KEYS.settlements)));

apiRouter.post("/compliance/screen", (req, res) => {
  const { name } = (req.body ?? {}) as { name?: string };
  res.json(screenSanctions(name ?? ""));
});

/* ----------------------------------------------------------------- ais ---- */

apiRouter.get("/beneficiaries", (_req, res) => res.json(getCollection(KEYS.beneficiaries)));
apiRouter.get("/direct-debits", (_req, res) => res.json(getCollection(KEYS.directDebits)));
apiRouter.get("/insights/income", (_req, res) =>
  res.json(
    computeIncomeInsights(
      getCollection<Transaction>(KEYS.transactions),
      getCollection<CashFlowPoint>(KEYS.cashflow30d),
    ),
  ),
);

/* ----------------------------------------------------------------- erp ---- */

apiRouter.get("/erp/cari", (_req, res) => res.json(getCollection(KEYS.erpCari)));
apiRouter.get("/erp/invoices", (_req, res) => res.json(getCollection(KEYS.erpInvoices)));
apiRouter.get("/erp/mappings", (_req, res) => res.json(getCollection(KEYS.erpMappings)));

// Öğrenme döngüsü: bir karşı taraf → cari eşlemesini kaydeder/pekiştirir.
apiRouter.post("/erp/mappings", (req, res) => {
  const { key, cariId } = (req.body ?? {}) as { key?: string; cariId?: string };
  if (!key || !cariId) return res.status(400).json({ error: "key ve cariId zorunlu" });
  const list = getCollection<ErpMapping>(KEYS.erpMappings);
  const now = new Date().toISOString();
  const existing = list.find((m) => m.key === key);
  const updated = existing
    ? list.map((m) => (m.key === key ? { ...m, cariId, count: m.count + 1, updatedAt: now } : m))
    : [...list, { key, cariId, count: 1, updatedAt: now }];
  setCollection(KEYS.erpMappings, updated);
  res.json({ ok: true });
});

/* ------------------------------------------------------------ cashflow ---- */

apiRouter.get("/cashflow/30d", (_req, res) => res.json(getCollection(KEYS.cashflow30d)));
apiRouter.get("/cashflow/forecast", (_req, res) => res.json(getCollection(KEYS.cashflowForecast)));
apiRouter.get("/cashflow/expected", (_req, res) =>
  res.json({
    incoming: getCollection(KEYS.expectedIncoming),
    outgoing: getCollection(KEYS.expectedOutgoing),
  }),
);

/* ------------------------------------------------------------- reports ---- */

apiRouter.get("/reports", (_req, res) => res.json(getCollection<ReportPackage>(KEYS.reports)));

apiRouter.post("/reports/generate", (_req, res) => {
  const txnCount = getCollection<Transaction>(KEYS.transactions).length;
  const pkg: ReportPackage = {
    id: `rep-${Date.now()}`,
    period: "2026 · 3. Çeyrek (taslak)",
    status: "Mühürlü",
    summary: `${txnCount} hareket · 4 banka · az önce üretildi`,
    sha256: Math.random().toString(16).slice(2, 8) + "…" + Math.random().toString(16).slice(2, 6),
    generatedAt: "az önce",
  };
  setCollection(KEYS.reports, [pkg, ...getCollection<ReportPackage>(KEYS.reports)]);
  res.json(pkg);
});

/* ------------------------------------------------------------- clients ---- */

apiRouter.get("/clients", (_req, res) => res.json(getCollection(KEYS.clients)));

/* ------------------------------------------------------- notifications ---- */

apiRouter.get("/notifications", (_req, res) => res.json(getCollection<NotificationSetting>(KEYS.notifications)));

apiRouter.post("/notifications/:id/toggle", (req, res) => {
  const settings = getCollection<NotificationSetting>(KEYS.notifications).map((n) =>
    n.id === req.params.id ? { ...n, enabled: !n.enabled } : n,
  );
  setCollection(KEYS.notifications, settings);
  res.json({ ok: true });
});

/* ----------------------------------------------------------- assistant ---- */

apiRouter.post("/assistant", (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  const history = getCollection<AssistantExchange>(KEYS.assistant);
  if (!question) return res.json(history[0]);
  const accountCount = getCollection<Account>(KEYS.accounts).length;
  const exchange: AssistantExchange = {
    id: `asst-${Date.now()}`,
    question,
    answeredAt: "şimdi",
    scannedAccounts: accountCount,
    responseMs: 380,
    answer: `"${question}" için ${accountCount} hesap tarandı. Bu yanıt canlı backend üzerinden üretildi; gerçek banka entegrasyonunda hareketleriniz üzerinden hesaplanır.`,
    rows: [],
  };
  setCollection(KEYS.assistant, [exchange, ...history]);
  res.json(exchange);
});
