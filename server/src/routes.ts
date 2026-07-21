import { Router } from "express";
import type {
  Account,
  AssistantExchange,
  CardCollection,
  ConsentGrant,
  NotificationSetting,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  RecentPayment,
  ReportPackage,
  Transaction,
} from "../../src/lib/types";
import {
  ALL_COMPANIES,
  DEMO_NOW,
  POS_COMMISSION,
  bankOf,
  lookupBin,
} from "../../src/lib/mockData";
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
    setCollection(KEYS.payments, [
      {
        id: `pay-${Date.now()}`,
        bankId: approval.bankId,
        recipient: approval.title,
        channel: "FAST",
        time: "şimdi",
        amount: approval.amount,
        status: "Bankada",
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

apiRouter.get("/payments", (_req, res) => res.json(getCollection<RecentPayment>(KEYS.payments)));

apiRouter.post("/payments", (req, res) => {
  const input = req.body ?? {};
  const account = getCollection<Account>(KEYS.accounts).find((a) => a.id === input.sourceAccountId);
  const payment: RecentPayment = {
    id: `pay-${Date.now()}`,
    bankId: account?.bankId ?? "ziraat",
    recipient: input.recipient,
    channel: input.channel,
    time: "şimdi",
    amount: input.amount,
    status: "Bankada",
  };
  setCollection(KEYS.payments, [payment, ...getCollection<RecentPayment>(KEYS.payments)]);
  res.json(payment);
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

/* ------------------------------------------------------ reconciliation ---- */

apiRouter.get("/reconciliation", (_req, res) =>
  res.json(getCollection<ReconciliationException>(KEYS.reconciliation)),
);

apiRouter.post("/reconciliation/:id/match", (req, res) => {
  const remaining = getCollection<ReconciliationException>(KEYS.reconciliation).filter((e) => e.id !== req.params.id);
  setCollection(KEYS.reconciliation, remaining);
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
