import type {
  Account,
  AssistantExchange,
  Bank,
  BankId,
  BinInfo,
  CardCollection,
  CashFlowForecastPoint,
  CashFlowPoint,
  ClientSummary,
  Company,
  ConsentGrant,
  Currency,
  Beneficiary,
  DirectDebitMandate,
  ErpCari,
  ErpInvoice,
  ExpectedCashItem,
  NotificationSetting,
  OverdueReceivable,
  PayByBankRequest,
  PaymentLink,
  PendingApproval,
  ReconciliationException,
  Subscription,
  RecentPayment,
  RecurringPayment,
  ReportPackage,
  Transaction,
  TransactionCategory,
} from "./types";

/** Deterministic PRNG (mulberry32) so mock data is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260719);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Fixed "today" for this demo dataset — relative labels (lastSync, consent countdowns)
 * are computed against this instead of the real clock, so the story stays consistent
 * no matter when the app is actually opened. */
export const DEMO_NOW = new Date("2026-07-17T23:59:00+03:00");

function daysAgoIso(days: number, hour = 9, minute = 0): string {
  const d = new Date(DEMO_NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const COMPANY = {
  name: "Demir Ticaret A.Ş.",
  userName: "Selin Demir",
  userInitials: "SD",
  userRole: "Yönetici",
};

/** Kurulum sihirbazındaki başvuru formunu otomatik dolduran resmi firma bilgileri. */
export const COMPANY_DETAILS = {
  unvan: "Demir Ticaret A.Ş.",
  vergiDairesi: "Kadıköy V.D.",
  vergiNo: "2960148751",
  mersisNo: "0296014875100015",
  adres: "Barbaros Mah. Begonya Sok. No:1 Ataşehir / İstanbul",
  yetkili: "Selin Demir",
  yetkiliUnvan: "Genel Müdür",
  yetkiliTckn: "123••••••45",
  telefon: "+90 216 555 12 34",
  eposta: "selin@demirticaret.com.tr",
  kep: "demirticaret@hs01.kep.tr",
};

export interface BankOnboarding {
  formName: string;
  formCode: string;
  channel: string;
  kep: string;
  processDays: string;
  cautions: string[];
}

/** Bankaya özel başvuru formu meta verisi + gönderim rehberi. */
export const BANK_ONBOARDING: Record<BankId, BankOnboarding> = {
  ziraat: {
    formName: "Ziraat Bankası — Açık Bankacılık Kurumsal Başvuru Formu",
    formCode: "ABK-KUR-01",
    channel: "Kurumsal İnternet Şubesi › Başvurular veya şube",
    kep: "ziraatbankasi@hs01.kep.tr",
    processDays: "2–3 iş günü",
    cautions: [
      "Ziraat başvurusu kurumsal internet şubesi üzerinden veya şubeden yapılabilir; e-posta kabul edilmez.",
      "Ödeme emri (TÖS) yetkisi için ek risk onay formu şube tarafından talep edilir.",
    ],
  },
  isbankasi: {
    formName: "Türkiye İş Bankası — Açık Bankacılık Hizmet Başvuru Formu",
    formCode: "AB-2024-KRML",
    channel: "İşCep Kurumsal › Başvurular veya KEP",
    kep: "isbankasi@hs03.kep.tr",
    processDays: "1–2 iş günü",
    cautions: [
      "İş Bankası KEP ile gönderimi kabul eder; form PDF/A ve e-imzalı olmalıdır.",
      "Talep edilen IBAN'lar aynı vergi numarasına bağlı olmalıdır.",
    ],
  },
  garanti: {
    formName: "Garanti BBVA — Açık Bankacılık Başvuru ve Muvafakatname",
    formCode: "GB-OB-CORP",
    channel: "KEP (zorunlu) — ıslak imzalı form taranıp gönderilir",
    kep: "garantibbva@hs02.kep.tr",
    processDays: "3–4 iş günü",
    cautions: [
      "Garanti BBVA için başvuru yalnızca KEP ile kabul edilir; şubeye elden teslim edilmez.",
      "Muvafakatname sayfası ayrıca imzalanmalı ve imza sirküleri ekte gönderilmelidir.",
    ],
  },
  yapikredi: {
    formName: "Yapı Kredi — Açık Bankacılık Kurumsal Talep Formu",
    formCode: "YKB-AB-01",
    channel: "Şube randevusu (elden teslim)",
    kep: "yapikredi@hs01.kep.tr",
    processDays: "2–3 iş günü",
    cautions: [
      "Yapı Kredi başvurusu için şube randevusu alınması gerekir; formun aslı elden teslim edilir.",
      "Randevuya imza yetkilisinin bizzat katılması beklenir.",
    ],
  },
};

/** Her bankada tüm başvurular için ortak dikkat noktaları. */
export const COMMON_ONBOARDING_CAUTIONS = [
  "Formun tüm sayfaları firma kaşesi ve yetkili ıslak/elektronik imzasıyla imzalanmalıdır.",
  "Güncel imza sirküleri (aslı veya noter onaylı sureti) ekte gönderilmelidir.",
  "İmza atan kişinin temsil-ilzam yetkisi MERSIS kaydıyla uyumlu ve güncel olmalıdır.",
  "Talep edilen tüm IBAN'lar firmaya ait olmalıdır; ortak veya şahıs hesapları kabul edilmez.",
  "Onay sonrası bankadan gelen SMS/e-posta aktivasyon bağlantısı 24 saat içinde tamamlanmalıdır.",
];

// ── API Hub · ERP web servis entegrasyonları ─────────────────────────────────

export interface ErpEndpoint {
  method: string;
  path: string;
  desc: string;
}

export interface ErpIntegration {
  id: string;
  name: string;
  vendor: string;
  category: string;
  protocol: "REST" | "SOAP";
  version: string;
  baseUrl: string;
  auth: string;
  format: "JSON" | "XML";
  status: "Aktif" | "Beta" | "Yakında";
  colorHex: string;
  endpoints: ErpEndpoint[];
  note: string;
}

const REST_ENDPOINTS: ErpEndpoint[] = [
  { method: "GET", path: "/api/v1/cari", desc: "Cari hesap listesi" },
  { method: "GET", path: "/api/v1/cari/{kod}", desc: "Cari hesap detayı ve bakiye" },
  { method: "GET", path: "/api/v1/faturalar", desc: "Fatura listesi (tarih/ cari filtreli)" },
  { method: "POST", path: "/api/v1/banka-hareketleri", desc: "Banka hareketi / dekont aktarımı" },
  { method: "POST", path: "/api/v1/muhasebe-fisi", desc: "Muhasebe fişi oluşturma" },
  { method: "GET", path: "/api/v1/mutabakat/durum", desc: "Cari mutabakat durumu sorgulama" },
];

const SOAP_ENDPOINTS: ErpEndpoint[] = [
  { method: "SOAP", path: "GetCariListesi", desc: "Cari hesap listesi" },
  { method: "SOAP", path: "GetCariBakiye", desc: "Cari hesap bakiye sorgu" },
  { method: "SOAP", path: "GetFaturalar", desc: "Fatura listesi" },
  { method: "SOAP", path: "AktarBankaHareketi", desc: "Banka hareketi / dekont aktarımı" },
  { method: "SOAP", path: "OlusturMuhasebeFisi", desc: "Muhasebe fişi oluşturma" },
];

export const ERP_INTEGRATIONS: ErpIntegration[] = [
  {
    id: "logo-tiger",
    name: "Logo Tiger 3 / GO 3",
    vendor: "Logo Yazılım",
    category: "Kurumsal ERP",
    protocol: "REST",
    version: "v2.4",
    baseUrl: "https://{sunucu}/logo/restservice",
    auth: "OAuth 2.0 (client_credentials)",
    format: "JSON",
    status: "Aktif",
    colorHex: "#E4002B",
    endpoints: REST_ENDPOINTS,
    note: "Logo Nesnesi (LOBJECT) üzerinden cari ve dekont eşleşmesi; firma/dönem numarası header ile gönderilir.",
  },
  {
    id: "logo-netsis",
    name: "Logo Netsis 3 Enterprise",
    vendor: "Logo Yazılım",
    category: "Kurumsal ERP",
    protocol: "SOAP",
    version: "v9.x",
    baseUrl: "https://{sunucu}/NetOpenX/NetRS.asmx",
    auth: "Kullanıcı + Şifre + Branch/DB",
    format: "XML",
    status: "Aktif",
    colorHex: "#00843D",
    endpoints: SOAP_ENDPOINTS,
    note: "NetOpenX (NetRS) web servisi; oturum açılıp DBUser/DBPassword ile şube ve dönem seçilir.",
  },
  {
    id: "mikro",
    name: "Mikro Jump / Fly",
    vendor: "Mikro Yazılım",
    category: "KOBİ ERP",
    protocol: "REST",
    version: "v1.8",
    baseUrl: "https://api.mikro.com.tr/v1",
    auth: "API Key + Bearer Token",
    format: "JSON",
    status: "Aktif",
    colorHex: "#0056A4",
    endpoints: REST_ENDPOINTS,
    note: "Cari ve banka fişi entegrasyonu; token 60 dk geçerlidir, yenileme uç noktası ile tazelenir.",
  },
  {
    id: "nebim",
    name: "Nebim V3",
    vendor: "Nebim",
    category: "Perakende ERP",
    protocol: "SOAP",
    version: "v3.11",
    baseUrl: "https://{sunucu}/NebimV3/Service.svc",
    auth: "WS-Security (UsernameToken)",
    format: "XML",
    status: "Aktif",
    colorHex: "#5B2A86",
    endpoints: SOAP_ENDPOINTS,
    note: "Perakende tahsilat ve POS mutabakatı için mağaza/kasa bazlı dekont aktarımı desteklenir.",
  },
  {
    id: "sap-b1",
    name: "SAP Business One",
    vendor: "SAP",
    category: "Kurumsal ERP",
    protocol: "REST",
    version: "Service Layer v2",
    baseUrl: "https://{sunucu}:50000/b1s/v2",
    auth: "Session Login (B1SESSION cookie)",
    format: "JSON",
    status: "Aktif",
    colorHex: "#0FAAFF",
    endpoints: REST_ENDPOINTS,
    note: "Service Layer OData; BusinessPartners ve JournalEntries nesneleri üzerinden eşleşme yapılır.",
  },
  {
    id: "dynamics",
    name: "Microsoft Dynamics 365 BC",
    vendor: "Microsoft",
    category: "Kurumsal ERP",
    protocol: "REST",
    version: "API v2.0",
    baseUrl: "https://api.businesscentral.dynamics.com/v2.0",
    auth: "OAuth 2.0 (Azure AD)",
    format: "JSON",
    status: "Beta",
    colorHex: "#0067B8",
    endpoints: REST_ENDPOINTS,
    note: "Azure AD uygulama kaydı ve yönetici onayı gerekir; environment/company parametreleri zorunludur.",
  },
  {
    id: "uyumsoft",
    name: "Uyumsoft ERP",
    vendor: "Uyumsoft",
    category: "Kurumsal ERP",
    protocol: "SOAP",
    version: "v2.2",
    baseUrl: "https://{sunucu}/UyumApi/Service.asmx",
    auth: "Token (Login servisi)",
    format: "XML",
    status: "Aktif",
    colorHex: "#F26522",
    endpoints: SOAP_ENDPOINTS,
    note: "e-Fatura entegratör tarafıyla ortak token; banka dekontu cari harekete otomatik bağlanır.",
  },
  {
    id: "eta",
    name: "ETA SQL",
    vendor: "ETA Bilgisayar",
    category: "KOBİ ERP",
    protocol: "SOAP",
    version: "v8.35",
    baseUrl: "https://{sunucu}/EtaWS/Service.asmx",
    auth: "Kullanıcı + Şifre",
    format: "XML",
    status: "Yakında",
    colorHex: "#1F6FB2",
    endpoints: SOAP_ENDPOINTS,
    note: "Yerel sunucu kurulumları için VPN/sabit IP gerektirir; entegrasyon Q3 2026'da yayına alınacaktır.",
  },
];

export const API_HUB_STATS = {
  connectedErp: 5,
  activeEndpoints: 34,
  monthlyCalls: "128.400",
  avgLatencyMs: 210,
};

/** Sentinel companyId meaning "every group company, consolidated". */
export const ALL_COMPANIES = "all" as const;

export const COMPANIES: Company[] = [
  { id: "demir-ticaret", name: "Demir Ticaret A.Ş.", shortName: "Demir Ticaret", sector: "Toptan gıda" },
  { id: "demir-lojistik", name: "Demir Lojistik A.Ş.", shortName: "Demir Lojistik", sector: "Taşımacılık" },
  { id: "demir-yapi", name: "Demir Yapı Malzemeleri Ltd.", shortName: "Demir Yapı", sector: "İnşaat malzeme" },
];

export function companyOf(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

/** TRY per 1 unit of foreign currency — mid-market, for consolidating group balances. */
export const FX_RATES_TO_TRY: Record<Exclude<Currency, "TRY">, number> = {
  USD: 41.135,
  EUR: 44.7,
  GBP: 52.205,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function convertToTRY(amount: number, currency: Currency): number {
  if (currency === "TRY") return amount;
  return amount * FX_RATES_TO_TRY[currency];
}

export function convertFromTRY(amountInTRY: number, target: Currency): number {
  if (target === "TRY") return amountInTRY;
  return amountInTRY / FX_RATES_TO_TRY[target];
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  return convertFromTRY(convertToTRY(amount, from), to);
}

export const BANKS: Bank[] = [
  { id: "ziraat", name: "Ziraat Bankası", shortName: "Ziraat", initials: "Z", colorHex: "#B4231E" },
  { id: "isbankasi", name: "Türkiye İş Bankası", shortName: "İş Bankası", initials: "İŞ", colorHex: "#1B2A63" },
  { id: "garanti", name: "Garanti BBVA", shortName: "Garanti BBVA", initials: "G", colorHex: "#0C6B41" },
  { id: "yapikredi", name: "Yapı Kredi", shortName: "Yapı Kredi", initials: "YK", colorHex: "#1E3A6E" },
];

export function bankOf(id: BankId): Bank {
  return BANKS.find((b) => b.id === id)!;
}

export const ACCOUNTS: Account[] = [
  {
    id: "acc-ziraat-vadesiz",
    companyId: "demir-ticaret",
    bankId: "ziraat",
    label: "Ziraat — Vadesiz TL",
    subLabel: "Ana hesap",
    iban: "TR33 0001 0002 3456 7891 0122 17",
    currency: "TRY",
    balance: 1_118_640,
    availableBalance: 1_318_640,
    lastSync: daysAgoIso(0, 12, 4),
    kind: "vadesiz",
  },
  {
    id: "acc-ziraat-pos",
    companyId: "demir-ticaret",
    bankId: "ziraat",
    label: "Ziraat — POS Hesabı",
    subLabel: "Tahsilat",
    iban: "TR33 0001 0002 3456 7891 0122 18",
    currency: "TRY",
    balance: 86_240,
    availableBalance: 86_240,
    lastSync: daysAgoIso(0, 12, 4),
    kind: "pos",
  },
  {
    id: "acc-is-vadesiz",
    companyId: "demir-ticaret",
    bankId: "isbankasi",
    label: "İş Bankası — Vadesiz TL",
    subLabel: "Operasyon",
    iban: "TR64 0006 4000 0011 2345 6788 21",
    currency: "TRY",
    balance: 638_210,
    availableBalance: 638_210,
    lastSync: daysAgoIso(0, 11, 58),
    kind: "vadesiz",
  },
  {
    id: "acc-is-doviz",
    companyId: "demir-ticaret",
    bankId: "isbankasi",
    label: "İş Bankası — Döviz (USD)",
    subLabel: "Döviz",
    iban: "TR64 0006 4000 0021 2345 6788 22",
    currency: "USD",
    balance: 4_975,
    availableBalance: 4_975,
    lastSync: daysAgoIso(0, 11, 58),
    kind: "doviz",
  },
  {
    id: "acc-garanti-vadesiz",
    companyId: "demir-ticaret",
    bankId: "garanti",
    label: "Garanti BBVA — Vadesiz TL",
    subLabel: "Operasyon · ek hesap",
    iban: "TR63 0006 2000 1234 0006 2988 34",
    currency: "TRY",
    balance: 571_425.42,
    availableBalance: 923_384,
    lastSync: daysAgoIso(0, 11, 56),
    kind: "ekhesap",
    overdraftLimit: 148_041.17,
  },
  {
    id: "acc-yapikredi-vadesiz",
    companyId: "demir-ticaret",
    bankId: "yapikredi",
    label: "Yapı Kredi — Vadesiz TL",
    subLabel: "POS + operasyon",
    iban: "TR12 0006 7010 0000 0074 4155 09",
    currency: "TRY",
    balance: 228_400,
    availableBalance: 228_400,
    lastSync: daysAgoIso(0, 12, 4),
    kind: "vadesiz",
  },
  {
    id: "acc-lojistik-try",
    companyId: "demir-lojistik",
    bankId: "isbankasi",
    label: "İş Bankası — Vadesiz TL",
    subLabel: "Demir Lojistik operasyon",
    iban: "TR64 0006 4000 0033 7788 9911 05",
    currency: "TRY",
    balance: 312_540,
    availableBalance: 312_540,
    lastSync: daysAgoIso(0, 10, 20),
    kind: "vadesiz",
  },
  {
    id: "acc-lojistik-eur",
    companyId: "demir-lojistik",
    bankId: "isbankasi",
    label: "İş Bankası — Döviz (EUR)",
    subLabel: "Demir Lojistik · Avrupa hattı",
    iban: "TR64 0006 4000 0033 7788 9911 06",
    currency: "EUR",
    balance: 18_400,
    availableBalance: 18_400,
    lastSync: daysAgoIso(0, 10, 20),
    kind: "doviz",
  },
  {
    id: "acc-yapi-try",
    companyId: "demir-yapi",
    bankId: "garanti",
    label: "Garanti BBVA — Vadesiz TL",
    subLabel: "Demir Yapı operasyon",
    iban: "TR63 0006 2000 1234 0007 4471 12",
    currency: "TRY",
    balance: 204_860,
    availableBalance: 204_860,
    lastSync: daysAgoIso(0, 9, 45),
    kind: "vadesiz",
  },
  {
    id: "acc-yapi-gbp",
    companyId: "demir-yapi",
    bankId: "garanti",
    label: "Garanti BBVA — Döviz (GBP)",
    subLabel: "Demir Yapı · ithalat",
    iban: "TR63 0006 2000 1234 0007 4471 13",
    currency: "GBP",
    balance: 6_250,
    availableBalance: 6_250,
    lastSync: daysAgoIso(0, 9, 45),
    kind: "doviz",
  },
];

export const TOTAL_BALANCE = ACCOUNTS.filter(
  (a) => a.companyId === "demir-ticaret" && a.currency === "TRY",
).reduce((sum, a) => sum + a.balance, 0);

/** Consolidated TRY-equivalent balance across every group company and currency. */
export function totalBalanceFor(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + convertToTRY(a.balance, a.currency), 0);
}

const COUNTERPARTIES: { name: string; category: TransactionCategory; channel: Transaction["channel"] }[] = [
  { name: "Karadeniz Gıda Toptan", category: "Tahsilat", channel: "FAST" },
  { name: "Beyaz Ofis Kırtasiye", category: "Tahsilat", channel: "POS" },
  { name: "Ege Market Zinciri", category: "Tahsilat", channel: "FAST" },
  { name: "Anadolu Ambalaj San.", category: "Tedarikçi", channel: "EFT" },
  { name: "Delta Elektrik", category: "Tedarikçi", channel: "EFT" },
  { name: "Mert Nakliyat", category: "Tedarikçi", channel: "Havale" },
  { name: "Meridyen Lojistik", category: "Tedarikçi", channel: "EFT" },
  { name: "SGK Prim Ödemesi", category: "Vergi & SGK", channel: "Otomatik Talimat" },
  { name: "Vergi Dairesi — KDV", category: "Vergi & SGK", channel: "EFT" },
  { name: "Kira — Merkez Depo", category: "Kira", channel: "Otomatik Talimat" },
  { name: "Personel Maaş Ödemesi", category: "Maaş", channel: "EFT" },
  { name: "Döviz Alım İşlemi", category: "Döviz", channel: "Havale" },
];

function buildTransactions(count: number): Transaction[] {
  const list: Transaction[] = [];
  let dayCursor = 0;
  for (let i = 0; i < count; i++) {
    dayCursor += rand() < 0.6 ? 0 : 1;
    const account = pick(ACCOUNTS.filter((a) => a.currency === "TRY" && a.companyId === "demir-ticaret"));
    const template = pick(COUNTERPARTIES);
    const isIncoming = template.category === "Tahsilat";
    const amount = isIncoming
      ? randInt(4_000, 96_000)
      : -randInt(3_000, 386_000);
    const unmatched = rand() < 0.045;
    list.push({
      id: `txn-${i.toString().padStart(4, "0")}`,
      bankId: account.bankId,
      accountId: account.id,
      date: daysAgoIso(dayCursor, randInt(8, 18), randInt(0, 59)),
      counterparty: template.name,
      description: `${template.channel} · ${template.name}`,
      channel: template.channel,
      reference: `FTR-2026-${randInt(1000, 1299)}`,
      category: unmatched ? "Eşleşmedi" : template.category,
      amount,
      balanceAfter: account.balance - i * 120,
      accountingStatus: unmatched ? "Bekliyor" : rand() < 0.05 ? "Hata" : "Aktarıldı",
      flaggedAnomaly: false,
    });
  }
  return list;
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: "txn-0000",
    bankId: "isbankasi",
    accountId: "acc-is-vadesiz",
    date: daysAgoIso(0, 10, 42),
    counterparty: "Karadeniz Gıda Toptan",
    description: 'FAST · "2026-7 TAHSILAT" · Karadeniz Gıda',
    channel: "FAST",
    reference: "2026-7 TAHSILAT",
    category: "Tahsilat",
    amount: 42_180,
    balanceAfter: 842_610,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0001",
    bankId: "ziraat",
    accountId: "acc-ziraat-vadesiz",
    date: daysAgoIso(0, 9, 0),
    counterparty: "SGK Prim Ödemesi",
    description: "SGK prim ödemesi · otomatik talimat",
    channel: "Otomatik Talimat",
    category: "Vergi & SGK",
    amount: -28_300,
    balanceAfter: 1_204_880,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0002",
    bankId: "garanti",
    accountId: "acc-garanti-vadesiz",
    date: daysAgoIso(1, 16, 20),
    counterparty: "Anadolu Ambalaj San.",
    description: "EFT · Anadolu Ambalaj · FTR-2026-1201",
    channel: "EFT",
    reference: "FTR-2026-1201",
    category: "Tedarikçi",
    amount: -46_600,
    balanceAfter: 571_425,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0003",
    bankId: "yapikredi",
    accountId: "acc-yapikredi-vadesiz",
    date: daysAgoIso(1, 23, 59),
    counterparty: "Beyaz Ofis Kırtasiye",
    description: "POS gün sonu tahsilatı · 214 işlem",
    channel: "POS",
    category: "Tahsilat",
    amount: 11_940,
    balanceAfter: 228_400,
    accountingStatus: "Bekliyor",
  },
  {
    id: "txn-0004",
    bankId: "ziraat",
    accountId: "acc-ziraat-vadesiz",
    date: daysAgoIso(2, 8, 0),
    counterparty: "Kira — Merkez Depo",
    description: "Kira — Merkez Depo · düzenli ödeme",
    channel: "Otomatik Talimat",
    category: "Kira",
    amount: -85_000,
    balanceAfter: 1_233_180,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0005",
    bankId: "ziraat",
    accountId: "acc-ziraat-vadesiz",
    date: daysAgoIso(2, 11, 34),
    counterparty: "Aksa Yapı Malz. San. Tic. Ltd.",
    description: 'FAST · "AKSA YAPI TEM ODEME 2026-7"',
    channel: "FAST",
    reference: "AKSA YAPI TEM ODEME 2026-7",
    category: "Eşleşmedi",
    amount: 57_820,
    balanceAfter: 1_318_180,
    accountingStatus: "Bekliyor",
  },
  {
    id: "txn-0006",
    bankId: "isbankasi",
    accountId: "acc-is-vadesiz",
    date: daysAgoIso(3, 17, 5),
    counterparty: "Mert Nakliyat",
    description: "Havale · Mert Nakliyat · açıklama boş",
    channel: "Havale",
    category: "Eşleşmedi",
    amount: -12_400,
    balanceAfter: 800_430,
    accountingStatus: "Hata",
  },
  {
    id: "txn-0007",
    bankId: "garanti",
    accountId: "acc-garanti-vadesiz",
    date: daysAgoIso(3, 9, 52),
    counterparty: "Döviz Alım İşlemi",
    description: "Döviz alış · 5.000 USD @ 41,12",
    channel: "EFT",
    category: "Döviz",
    amount: -205_600,
    balanceAfter: 618_025,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0008",
    bankId: "isbankasi",
    accountId: "acc-is-vadesiz",
    date: daysAgoIso(4, 14, 30),
    counterparty: "Personel Maaş Ödemesi",
    description: "Maaş ödemesi · 14 personel",
    channel: "EFT",
    category: "Maaş",
    amount: -386_000,
    balanceAfter: 812_830,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0009",
    bankId: "yapikredi",
    accountId: "acc-yapikredi-vadesiz",
    date: daysAgoIso(4, 10, 11),
    counterparty: "Delta Elektrik",
    description: "EFT · Delta Elektrik · FTR-2026-1122",
    channel: "EFT",
    reference: "FTR-2026-1122",
    category: "Tedarikçi",
    amount: -31_075,
    balanceAfter: 216_460,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0010",
    bankId: "ziraat",
    accountId: "acc-ziraat-vadesiz",
    date: daysAgoIso(3, 13, 15),
    counterparty: "Kendi hesabım — İş Bankası",
    description: "Virman · Ziraat → İş Bankası",
    channel: "EFT",
    category: "Virman",
    amount: -150_000,
    balanceAfter: 1_083_180,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0011",
    bankId: "isbankasi",
    accountId: "acc-is-vadesiz",
    date: daysAgoIso(3, 13, 16),
    counterparty: "Kendi hesabım — Ziraat",
    description: "Virman · Ziraat → İş Bankası",
    channel: "EFT",
    category: "Virman",
    amount: 150_000,
    balanceAfter: 950_430,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0012",
    bankId: "garanti",
    accountId: "acc-garanti-vadesiz",
    date: daysAgoIso(6, 9, 40),
    counterparty: "Kendi hesabım — Yapı Kredi",
    description: "Virman · Garanti BBVA → Yapı Kredi",
    channel: "FAST",
    category: "Virman",
    amount: -75_000,
    balanceAfter: 693_025,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-0013",
    bankId: "yapikredi",
    accountId: "acc-yapikredi-vadesiz",
    date: daysAgoIso(6, 9, 41),
    counterparty: "Kendi hesabım — Garanti BBVA",
    description: "Virman · Garanti BBVA → Yapı Kredi",
    channel: "FAST",
    category: "Virman",
    amount: 75_000,
    balanceAfter: 247_460,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-lojistik-0001",
    bankId: "isbankasi",
    accountId: "acc-lojistik-try",
    date: daysAgoIso(1, 8, 30),
    counterparty: "Petrol Ofisi Filo",
    description: "Otomatik ödeme talimatı · filo yakıt",
    channel: "Otomatik Talimat",
    category: "Tedarikçi",
    amount: -64_200,
    balanceAfter: 312_540,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-lojistik-0002",
    bankId: "isbankasi",
    accountId: "acc-lojistik-try",
    date: daysAgoIso(2, 15, 10),
    counterparty: "Marmara Nakliyat Müşteri",
    description: 'FAST · "navlun tahsilatı 2026-7"',
    channel: "FAST",
    category: "Tahsilat",
    amount: 118_400,
    balanceAfter: 376_740,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-lojistik-0003",
    bankId: "isbankasi",
    accountId: "acc-lojistik-try",
    date: daysAgoIso(4, 14, 0),
    counterparty: "Sürücü Maaş Ödemesi",
    description: "Maaş ödemesi · 9 sürücü",
    channel: "EFT",
    category: "Maaş",
    amount: -142_000,
    balanceAfter: 258_340,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-lojistik-0004",
    bankId: "isbankasi",
    accountId: "acc-lojistik-eur",
    date: daysAgoIso(3, 11, 20),
    counterparty: "EuroTrans Spedition GmbH",
    description: "EFT · Avrupa hattı navlun ödemesi",
    channel: "EFT",
    category: "Tedarikçi",
    amount: -6_800,
    balanceAfter: 18_400,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-yapi-0001",
    bankId: "garanti",
    accountId: "acc-yapi-try",
    date: daysAgoIso(1, 10, 45),
    counterparty: "Akçansa Çimento",
    description: "EFT · Çimento tedarik · FTR-2026-YP04",
    channel: "EFT",
    reference: "FTR-2026-YP04",
    category: "Tedarikçi",
    amount: -88_500,
    balanceAfter: 204_860,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-yapi-0002",
    bankId: "garanti",
    accountId: "acc-yapi-try",
    date: daysAgoIso(2, 16, 30),
    counterparty: "Yıldız İnşaat Müşteri",
    description: 'FAST · "hakediş ödemesi"',
    channel: "FAST",
    category: "Tahsilat",
    amount: 156_000,
    balanceAfter: 293_360,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-yapi-0003",
    bankId: "garanti",
    accountId: "acc-yapi-try",
    date: daysAgoIso(5, 8, 0),
    counterparty: "Depo Kirası",
    description: "Kira — antrepo · düzenli ödeme",
    channel: "Otomatik Talimat",
    category: "Kira",
    amount: -34_000,
    balanceAfter: 137_360,
    accountingStatus: "Aktarıldı",
  },
  {
    id: "txn-yapi-0004",
    bankId: "garanti",
    accountId: "acc-yapi-gbp",
    date: daysAgoIso(4, 9, 15),
    counterparty: "Bristol Building Supplies Ltd.",
    description: "EFT · İngiltere ithalat ödemesi",
    channel: "EFT",
    category: "Tedarikçi",
    amount: -2_150,
    balanceAfter: 6_250,
    accountingStatus: "Aktarıldı",
  },
  ...buildTransactions(673),
];

export const ANOMALY = {
  counterparty: "Meridyen Lojistik",
  amount: 48_200,
  multiple: 3.1,
  monthLabel: "bu ay",
};

export const CONSENTS: ConsentGrant[] = [
  {
    bankId: "garanti",
    accountsCount: 1,
    status: "expiring",
    grantedAt: daysAgoIso(158),
    expiresAt: daysAgoIso(-5),
    scopeLabel: "TR63 **** 8834",
  },
  {
    bankId: "ziraat",
    accountsCount: 2,
    status: "active",
    grantedAt: daysAgoIso(30),
    expiresAt: daysAgoIso(-147),
    scopeLabel: "vadesiz + POS",
  },
  {
    bankId: "isbankasi",
    accountsCount: 2,
    status: "active",
    grantedAt: daysAgoIso(75),
    expiresAt: daysAgoIso(-108),
    scopeLabel: "vadesiz + döviz",
  },
  {
    bankId: "yapikredi",
    accountsCount: 1,
    status: "active",
    grantedAt: daysAgoIso(93),
    expiresAt: daysAgoIso(-93),
    scopeLabel: "vadesiz",
  },
];

export const TEAM_MEMBERS = ["Selin Demir", "M. Kaya", "A. Yılmaz", "B. Öztürk", "C. Aydın"];

export const ERP_CARI_LIST: ErpCari[] = [
  { id: "cari-1", name: "Anadolu Ambalaj San. Tic. A.Ş.", iban: "TR58 0006 4000 0012 3456 4471 01", vergiNo: "1234567890" },
  { id: "cari-2", name: "Karadeniz Gıda Toptan", iban: "TR12 0006 4000 0012 8890 3312 02", vergiNo: "2345678901" },
  { id: "cari-3", name: "Delta Elektrik", iban: "TR64 0006 7010 0000 1122 4155 03", vergiNo: "3456789012" },
  { id: "cari-4", name: "Meridyen Lojistik", iban: "TR77 0006 2000 1234 3345 2988 04", vergiNo: "4567890123" },
  { id: "cari-5", name: "Mert Nakliyat", iban: "TR29 0006 4000 0011 7723 6788 05", vergiNo: "5678901234" },
  { id: "cari-6", name: "Beyaz Ofis Kırtasiye", iban: "TR41 0001 0002 3456 9012 0122 06", vergiNo: "6789012345" },
  { id: "cari-7", name: "Ege Market Zinciri", iban: "TR83 0006 2000 1234 5566 2988 07", vergiNo: "7890123456" },
  { id: "cari-8", name: "Aksa Yapı Malz. San. Tic. Ltd.", iban: "TR95 0001 0002 3456 7788 0122 08", vergiNo: "8901234567" },
];

/**
 * Açık ERP faturaları — banka hareketleriyle eşleştirme motorunun aday havuzu.
 * alacak: müşteri bize borçlu (gelen ödemeyle kapanır) · borc: tedarikçiye borçluyuz (giden ödemeyle kapanır).
 */
export const ERP_INVOICES: ErpInvoice[] = [
  // Aksa Yapı (cari-8) — rec-1: tek fatura 57.820 veya 1163+1170 toplamı
  { id: "inv-1184", docNo: "FTR-2026-1184", cariId: "cari-8", direction: "alacak", amount: 57_820, issueDate: daysAgoIso(7), dueDate: daysAgoIso(-23), status: "open" },
  { id: "inv-1163", docNo: "FTR-2026-1163", cariId: "cari-8", direction: "alacak", amount: 26_300, issueDate: daysAgoIso(13), dueDate: daysAgoIso(-17), status: "open" },
  { id: "inv-1170", docNo: "FTR-2026-1170", cariId: "cari-8", direction: "alacak", amount: 31_520, issueDate: daysAgoIso(11), dueDate: daysAgoIso(-19), status: "open" },
  // Mert Nakliyat (cari-5) — rec-2: giden 12.400
  { id: "inv-1177", docNo: "FTR-2026-1177", cariId: "cari-5", direction: "borc", amount: 12_400, issueDate: daysAgoIso(20), dueDate: daysAgoIso(-5), status: "open" },
  // Delta Elektrik (cari-3) — rec-4: giden 31.075 (75 fark)
  { id: "inv-1122", docNo: "FTR-2026-1122", cariId: "cari-3", direction: "borc", amount: 31_000, issueDate: daysAgoIso(19), dueDate: daysAgoIso(-2), status: "open" },
  // Havuzu gerçekçi kılan diğer açık faturalar
  { id: "inv-1201", docNo: "FTR-2026-1201", cariId: "cari-2", direction: "alacak", amount: 42_000, issueDate: daysAgoIso(5), dueDate: daysAgoIso(-25), status: "open" },
  { id: "inv-1208", docNo: "FTR-2026-1208", cariId: "cari-7", direction: "alacak", amount: 18_750, issueDate: daysAgoIso(4), dueDate: daysAgoIso(-26), status: "open" },
  { id: "inv-1195", docNo: "FTR-2026-1195", cariId: "cari-1", direction: "borc", amount: 64_300, issueDate: daysAgoIso(9), dueDate: daysAgoIso(-6), status: "open" },
  { id: "inv-1189", docNo: "FTR-2026-1189", cariId: "cari-6", direction: "borc", amount: 3_480, issueDate: daysAgoIso(12), dueDate: daysAgoIso(-3), status: "open" },
  { id: "inv-1211", docNo: "FTR-2026-1211", cariId: "cari-4", direction: "borc", amount: 48_200, issueDate: daysAgoIso(2), dueDate: daysAgoIso(-28), status: "open" },
];

/** Banka ile öde (A2A) tahsilat talepleri — kart yerine hesaptan-hesaba, düşük komisyon. */
export const PAY_BY_BANK_REQUESTS: PayByBankRequest[] = [
  { id: "a2a-1", customer: "Ege Market Zinciri", amount: 18_750, invoiceRef: "FTR-2026-1208", status: "paid", createdAt: daysAgoIso(1, 10), paidAt: daysAgoIso(1, 10, 3), bankId: "garanti", fee: 56, net: 18_694 },
  { id: "a2a-2", customer: "Karadeniz Gıda Toptan", amount: 42_000, invoiceRef: "FTR-2026-1201", status: "pending", createdAt: daysAgoIso(0, 9), fee: 126, net: 41_874 },
  { id: "a2a-3", customer: "Beyaz Ofis Kırtasiye", amount: 6_300, status: "paid", createdAt: daysAgoIso(2, 14), paidAt: daysAgoIso(2, 14, 1), bankId: "isbankasi", fee: 19, net: 6_281 },
];

/** Abonelik / tekrarlı tahsilatlar — VRP mandasıyla otomatik. */
export const SUBSCRIPTIONS: Subscription[] = [
  { id: "sub-1", customer: "Delta Elektrik", planLabel: "Aylık bakım paketi", amount: 4_500, frequency: "monthly", status: "active", method: "a2a", mandateRef: "VRP-DLT-0091", nextCharge: daysAgoIso(-6, 9), collectedCount: 8, createdAt: daysAgoIso(240) },
  { id: "sub-2", customer: "Mert Nakliyat", planLabel: "Haftalık lojistik hizmeti", amount: 2_800, frequency: "weekly", status: "active", method: "a2a", mandateRef: "VRP-MRT-0148", nextCharge: daysAgoIso(-2, 9), collectedCount: 22, createdAt: daysAgoIso(160) },
  { id: "sub-3", customer: "Anadolu Ambalaj", planLabel: "Premium destek", amount: 1_200, frequency: "monthly", status: "paused", method: "card", mandateRef: "DD-ANA-0203", nextCharge: daysAgoIso(-12, 9), collectedCount: 5, createdAt: daysAgoIso(150) },
];

/** Bankada kayıtlı lehdarlar (saved payees) — AIS ile okunur. */
export const BENEFICIARIES: Beneficiary[] = [
  { id: "ben-1", name: "Aksa Yapı Malz. San. Tic. Ltd.", iban: "TR95 0001 0002 3456 7788 0122 08", bankId: "ziraat", lastUsed: daysAgoIso(2), trusted: true },
  { id: "ben-2", name: "Mert Nakliyat", iban: "TR29 0006 4000 0011 7723 6788 05", bankId: "isbankasi", lastUsed: daysAgoIso(3), trusted: true },
  { id: "ben-3", name: "Gelir İdaresi Başkanlığı", iban: "TR33 0001 0000 0000 0000 0000 01", bankId: "ziraat", lastUsed: daysAgoIso(26), trusted: true },
  { id: "ben-4", name: "Delta Elektrik", iban: "TR64 0006 7010 0000 1122 4155 03", bankId: "yapikredi", lastUsed: daysAgoIso(5) },
  { id: "ben-5", name: "Meridyen Lojistik", iban: "TR77 0006 2000 1234 3345 2988 04", bankId: "garanti", lastUsed: daysAgoIso(12) },
];

/** Hesaptan çekilen otomatik ödeme talimatları (DD mandaları) — AIS okuması. */
export const DIRECT_DEBIT_MANDATES: DirectDebitMandate[] = [
  { id: "dd-1", creditor: "Enerjisa Elektrik", reference: "ENJ-99120", accountId: "acc-ziraat-vadesiz", bankId: "ziraat", maxAmount: 18_000, frequency: "monthly", nextCollection: daysAgoIso(-5, 9), status: "active" },
  { id: "dd-2", creditor: "Türk Telekom", reference: "TT-44581", accountId: "acc-is-vadesiz", bankId: "isbankasi", maxAmount: 4_500, frequency: "monthly", nextCollection: daysAgoIso(-8, 9), status: "active" },
  { id: "dd-3", creditor: "Anadolu Sigorta", reference: "AS-71230", accountId: "acc-garanti-vadesiz", bankId: "garanti", maxAmount: 96_000, frequency: "yearly", nextCollection: daysAgoIso(-40, 9), status: "active" },
];

/** Otomatik ödeme talimatları — planlı, tekrarlı, VRP ve sweep örnekleri. */
export const RECURRING_PAYMENTS: RecurringPayment[] = [
  {
    id: "rec-kdv",
    kind: "standing_order",
    label: "KDV beyanname ödemesi",
    bankId: "ziraat",
    sourceAccountId: "acc-ziraat-vadesiz",
    recipient: "Gelir İdaresi Başkanlığı",
    iban: "TR33 0001 0000 0000 0000 0000 01",
    amount: 118_400,
    frequency: "monthly",
    nextRun: daysAgoIso(-4, 10),
    status: "active",
    runsCount: 7,
    lastRunAt: daysAgoIso(26),
    createdAt: daysAgoIso(210),
  },
  {
    id: "rec-kira",
    kind: "scheduled",
    label: "Merkez depo kirası",
    bankId: "garanti",
    sourceAccountId: "acc-garanti-vadesiz",
    recipient: "Kira — Merkez Depo",
    iban: "TR77 0006 2000 1234 3345 2988 04",
    amount: 85_000,
    frequency: "once",
    nextRun: daysAgoIso(-9, 9),
    status: "active",
    createdAt: daysAgoIso(3),
  },
  {
    id: "rec-vrp-bulut",
    kind: "vrp",
    label: "Bulut yazılım aboneliği (VRP)",
    bankId: "isbankasi",
    sourceAccountId: "acc-is-vadesiz",
    recipient: "Karadeniz Gıda Toptan",
    iban: "TR12 0006 4000 0012 8890 3312 02",
    amount: 5_000,
    amountVariable: true,
    frequency: "monthly",
    nextRun: daysAgoIso(-2, 8),
    status: "active",
    vrpMaxPerPeriod: 8_000,
    vrpUsedThisPeriod: 3_200,
    runsCount: 4,
    lastRunAt: daysAgoIso(28),
    createdAt: daysAgoIso(120),
  },
  {
    id: "rec-sweep",
    kind: "sweep",
    label: "POS tahsilatını ana hesaba süpür",
    bankId: "ziraat",
    sourceAccountId: "acc-ziraat-pos",
    targetAccountId: "acc-ziraat-vadesiz",
    recipient: "Ziraat — Vadesiz TL",
    amount: 0,
    sweepKeepBalance: 50_000,
    frequency: "weekly",
    nextRun: daysAgoIso(-1, 18),
    status: "active",
    runsCount: 12,
    lastRunAt: daysAgoIso(6),
    createdAt: daysAgoIso(90),
  },
];

/** Sanal POS (üye işyeri) komisyon oranları — tek çekim ve taksitli için ayrı. */
export const POS_COMMISSION = { single: 0.0189, installment: 0.0245 };

interface BinRule {
  prefix: string;
  info: BinInfo;
}

/**
 * BIN (kartın ilk 6 hanesi) → banka + kart programı + izinli taksitler.
 * Gerçek entegrasyonda bu tablo bir BIN sorgu servisiyle (ör. banka/POS sağlayıcısı)
 * değiştirilir; burada demo için gerçekçi bir alt küme sabit tutuluyor.
 */
const BIN_TABLE: BinRule[] = [
  { prefix: "540667", info: { bank: "Garanti BBVA", program: "Bonus", scheme: "Mastercard", colorHex: "#0C6B41", installments: [2, 3, 6, 9] } },
  { prefix: "554960", info: { bank: "Garanti BBVA", program: "Bonus", scheme: "Mastercard", colorHex: "#0C6B41", installments: [2, 3, 6, 9] } },
  { prefix: "428220", info: { bank: "Türkiye İş Bankası", program: "Maximum", scheme: "Visa", colorHex: "#1B2A63", installments: [2, 3, 6, 9, 12] } },
  { prefix: "454671", info: { bank: "Türkiye İş Bankası", program: "Maximum", scheme: "Visa", colorHex: "#1B2A63", installments: [2, 3, 6, 9, 12] } },
  { prefix: "415565", info: { bank: "Yapı Kredi", program: "World", scheme: "Visa", colorHex: "#1E3A6E", installments: [2, 3, 6, 8] } },
  { prefix: "552879", info: { bank: "Yapı Kredi", program: "World", scheme: "Mastercard", colorHex: "#1E3A6E", installments: [2, 3, 6, 8] } },
  { prefix: "467783", info: { bank: "Ziraat Bankası", program: "Bankkart", scheme: "Visa", colorHex: "#B4231E", installments: [2, 3, 6] } },
  { prefix: "979270", info: { bank: "Ziraat Bankası", program: "Bankkart Combo", scheme: "Troy", colorHex: "#B4231E", installments: [2, 3, 6] } },
  { prefix: "435508", info: { bank: "Akbank", program: "Axess", scheme: "Visa", colorHex: "#B01E28", installments: [2, 3, 6, 9, 12] } },
  { prefix: "552096", info: { bank: "QNB Finansbank", program: "CardFinans", scheme: "Mastercard", colorHex: "#5B2A86", installments: [2, 3, 6, 9] } },
];

function schemeFromFirstDigit(d: string): BinInfo["scheme"] {
  if (d === "4") return "Visa";
  if (d === "9") return "Troy";
  return "Mastercard";
}

/** İlk 6 haneden kart bilgisini çözer. 6 haneden az girildiyse null döner. */
export function lookupBin(cardDigits: string): BinInfo | null {
  const clean = cardDigits.replace(/\D/g, "");
  if (clean.length < 6) return null;
  const rule = BIN_TABLE.find((r) => clean.startsWith(r.prefix));
  if (rule) return rule.info;
  return {
    bank: "Bilinmeyen banka",
    program: "—",
    scheme: schemeFromFirstDigit(clean[0]),
    colorHex: "#7a7568",
    installments: [2, 3, 6],
  };
}

/** Deneme için hazır kart numaraları (Genel bakış demosu). */
export const SAMPLE_CARDS = [
  { label: "Garanti Bonus", number: "5406 6700 1234 5678" },
  { label: "İş Bankası Maximum", number: "4282 2012 3456 7890" },
  { label: "Yapı Kredi World", number: "4155 6501 2345 6789" },
];

export const RECENT_CARD_COLLECTIONS: CardCollection[] = [
  { id: "cc-1", maskedCard: "5406 66** **** 5678", bank: "Garanti BBVA", scheme: "Mastercard", amount: 4_320, installment: 3, commission: 106, net: 4_214, reference: "POS-2026-0912", time: "10:41" },
  { id: "cc-2", maskedCard: "4282 20** **** 7890", bank: "Türkiye İş Bankası", scheme: "Visa", amount: 11_940, installment: 1, commission: 226, net: 11_714, reference: "POS-2026-0911", time: "09:58" },
  { id: "cc-3", maskedCard: "4155 65** **** 6789", bank: "Yapı Kredi", scheme: "Visa", amount: 27_900, installment: 6, commission: 684, net: 27_216, reference: "POS-2026-0908", time: "dün 16:20" },
];

function chain(steps: { role: "Düzenleyen" | "Kontrol eden" | "Onaycı"; person: string; status: "Tamamlandı" | "Bekliyor" }[]) {
  return steps;
}

export const PENDING_APPROVALS: PendingApproval[] = [
  {
    id: "appr-1",
    title: "Maaş ödemesi — 14 personel",
    subtitle: "İş Bankası · toplu FAST · hazırlayan: M. Kaya",
    bankId: "isbankasi",
    amount: 386_000,
    requestedBy: "M. Kaya",
    chain: chain([
      { role: "Düzenleyen", person: "M. Kaya", status: "Tamamlandı" },
      { role: "Kontrol eden", person: "Selin Demir", status: "Bekliyor" },
      { role: "Onaycı", person: "A. Yılmaz", status: "Bekliyor" },
    ]),
  },
  {
    id: "appr-2",
    title: "KDV beyannamesi",
    subtitle: "Ziraat · vergi dairesi · planlı 26 Tem",
    bankId: "ziraat",
    amount: 118_400,
    requestedBy: "Otomasyon",
    chain: chain([
      { role: "Düzenleyen", person: "Otomasyon", status: "Tamamlandı" },
      { role: "Onaycı", person: "Selin Demir", status: "Bekliyor" },
    ]),
  },
  {
    id: "appr-3",
    title: "Mert Nakliyat",
    subtitle: "Garanti BBVA · EFT · yeni alıcı",
    bankId: "garanti",
    amount: 12_400,
    requestedBy: "S. Demir",
    chain: chain([
      { role: "Düzenleyen", person: "Selin Demir", status: "Tamamlandı" },
      { role: "Kontrol eden", person: "M. Kaya", status: "Bekliyor" },
      { role: "Onaycı", person: "A. Yılmaz", status: "Bekliyor" },
      { role: "Onaycı", person: "B. Öztürk", status: "Bekliyor" },
    ]),
    risky: true,
  },
];

export const RECENT_PAYMENTS: RecentPayment[] = [
  { id: "pay-1", bankId: "ziraat", recipient: "Anadolu Ambalaj San.", channel: "FAST", time: "10:41", amount: 46_600, status: "Tamamlandı" },
  { id: "pay-2", bankId: "isbankasi", recipient: "Delta Elektrik", channel: "EFT", time: "09:58", amount: 31_075, status: "Tamamlandı" },
  { id: "pay-3", bankId: "garanti", recipient: "Kira — Merkez Depo", channel: "FAST", time: "08:00", amount: 85_000, status: "Tamamlandı" },
  { id: "pay-4", bankId: "ziraat", recipient: "Beyaz Ofis Kırtasiye", channel: "FAST", time: "16 Tem", amount: 4_320, status: "Bankada" },
  { id: "pay-5", bankId: "isbankasi", recipient: "R. Yıldız (şahıs)", channel: "EFT", time: "15 Tem", amount: 47_305, status: "Reddedildi" },
];

export const PAYMENT_LINKS: PaymentLink[] = [
  { id: "link-1", customer: "Ege Market Zinciri", invoiceRef: "FTR-2026-1198", channel: "WhatsApp", sentAt: "dün gönderildi", amount: 96_000, status: "Görüntülendi" },
  { id: "link-2", customer: "Beyaz Ofis Kırtasiye", invoiceRef: "FTR-2026-1204", channel: "e-posta", sentAt: "bugün 09:14", amount: 18_400, status: "Ödendi" },
  { id: "link-3", customer: "Mavi Otel İşletmeleri", invoiceRef: "FTR-2026-1187", channel: "SMS", sentAt: "3 gün önce", amount: 31_600, status: "Bekliyor" },
  { id: "link-4", customer: "Çınar Lojistik", invoiceRef: "FTR-2026-1151", channel: "WhatsApp", sentAt: "9 gün önce", amount: 12_750, status: "Süresi doldu" },
];

export const OVERDUE_RECEIVABLES: OverdueReceivable[] = [
  { id: "od-1", customer: "Doğuş İnşaat", invoiceRef: "FTR-2026-0912", daysOverdue: 34, dueDate: "13 Haz", amount: 112_000, remindersSent: 2 },
  { id: "od-2", customer: "Mavi Otel İşletmeleri", invoiceRef: "FTR-2026-1043", daysOverdue: 23, dueDate: "24 Haz", amount: 64_300, remindersSent: 1 },
  { id: "od-3", customer: "Arel Elektronik", invoiceRef: "FTR-2026-1102", daysOverdue: 12, dueDate: "5 Tem", amount: 43_850, remindersSent: 1 },
  { id: "od-4", customer: "Yıldız Tekstil San.", invoiceRef: "FTR-2026-1130", daysOverdue: 6, dueDate: "11 Tem", amount: 27_750, remindersSent: 0 },
];

export const RECONCILIATION_EXCEPTIONS: ReconciliationException[] = [
  {
    id: "rec-1",
    transactionId: "txn-0005",
    bankId: "ziraat",
    accountTail: "4417",
    customer: "Aksa Yapı Malz. San. Tic. Ltd.",
    counterpartyIban: "TR95 0001 0002 3456 7788 0122 08",
    date: daysAgoIso(2, 11, 34),
    description: 'FAST · "AKSA YAPI TEM ODEME 2026-7"',
    amount: 57_820,
    reasonHint: "Tutar 2 faturanın toplamı olabilir",
    candidates: [
      { id: "cand-1", label: "FTR-2026-1184 · Aksa Yapı Malz.", detail: "14 Tem · e-Fatura · vade 30 gün", matchScore: 98, amount: 57_820 },
      { id: "cand-2", label: "FTR-2026-1163 + 1170 (toplam)", detail: "8 + 10 Tem · iki fatura tek ödeme", matchScore: 86, amount: 57_820 },
      { id: "cand-3", label: "Cari hesap kapama — Aksa Yapı", detail: "Açık bakiye ₺58.020 · ₺200 fark", matchScore: 71, amount: 58_020 },
    ],
  },
  {
    id: "rec-2",
    transactionId: "txn-0006",
    bankId: "isbankasi",
    accountTail: "8821",
    customer: "Mert Nakliyat",
    counterpartyIban: "TR29 0006 4000 0011 7723 6788 05",
    date: daysAgoIso(3, 17, 5),
    description: "Açıklama boş, karşı IBAN yeni",
    amount: -12_400,
    reasonHint: "Açıklama boş, karşı IBAN yeni",
    candidates: [
      { id: "cand-4", label: "FTR-2026-1177 · Mert Nakliyat", detail: "1 Tem · e-Fatura · vade 15 gün", matchScore: 64, amount: 12_400 },
    ],
  },
  {
    id: "rec-3",
    transactionId: "txn-havale-yildiz",
    bankId: "isbankasi",
    accountTail: "8821",
    customer: "Havale — R. Yıldız",
    date: daysAgoIso(3),
    description: "Şahıs hesabından, fatura yok",
    amount: 8_500,
    reasonHint: "Şahıs hesabından, fatura yok",
    candidates: [],
  },
  {
    id: "rec-4",
    transactionId: "txn-delta",
    bankId: "yapikredi",
    accountTail: "4155",
    customer: "Delta Elektrik",
    counterpartyIban: "TR64 0006 7010 0000 1122 4155 03",
    date: daysAgoIso(5),
    description: "Fatura tutarı ₺31.000 — ₺75 fark",
    amount: -31_075,
    reasonHint: "Fatura tutarı ₺31.000 — ₺75 fark",
    candidates: [
      { id: "cand-5", label: "FTR-2026-1122 · Delta Elektrik", detail: "2 Tem · e-Fatura", matchScore: 91, amount: 31_000 },
    ],
  },
  {
    id: "rec-5",
    transactionId: "txn-hepsiburada",
    bankId: "ziraat",
    accountTail: "0122",
    customer: "POS iade — Hepsiburada",
    date: daysAgoIso(6),
    description: "İade kaydı bulunamadı",
    amount: -2_149,
    reasonHint: "İade kaydı bulunamadı",
    candidates: [],
  },
];

// 90 günlük geçmiş — Genel bakış grafiğindeki tarih aralığı filtresi buradan beslenir.
// (İsim geriye dönük uyumluluk için CASH_FLOW_30D kaldı; endpoint /cashflow/30d.)
export const CASH_FLOW_30D: CashFlowPoint[] = Array.from({ length: 90 }, (_, i) => {
  const base = 55_000 + Math.sin(i / 4) * 18_000 + rand() * 6_000;
  return {
    date: daysAgoIso(89 - i),
    incoming: Math.round(base + 20_000),
    outgoing: Math.round(base * 0.78),
  };
});

export const CASH_FLOW_FORECAST: CashFlowForecastPoint[] = (() => {
  const points: CashFlowForecastPoint[] = [];
  const today = new Date("2026-07-17T00:00:00+03:00");
  for (let i = -30; i <= 0; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    points.push({ date: d.toISOString(), actual: TOTAL_BALANCE - i * 3200 + Math.sin(i / 3) * 40_000 });
  }
  const dips = [0.94, 0.86, 0.77, 0.71, 0.69, 0.72, 0.79, 0.88, 0.97, 1.05, 1.1];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const factor = i <= 11 ? dips[i - 1] : 1.1 + (i - 11) * 0.006;
    const forecast = TOTAL_BALANCE * factor;
    points.push({
      date: d.toISOString(),
      forecast,
      bandLow: forecast * 0.93,
      bandHigh: forecast * 1.07,
    });
  }
  return points;
})();

export const EXPECTED_INCOMING: ExpectedCashItem[] = [
  { id: "in-1", label: "Karadeniz Gıda Toptan", subLabel: "Düzenli · her ayın 17'si", amount: 42_000, date: "17 Ağu" },
  { id: "in-2", label: "Beyaz Ofis Kırtasiye", subLabel: "POS ort. günlük", amount: 11_500, date: "günlük" },
  { id: "in-3", label: "Ege Market Zinciri", subLabel: "Vadeli fatura FTR-1198", amount: 96_000, date: "28 Tem" },
  { id: "in-4", label: "Doğuş İnşaat hakediş", subLabel: "Sözleşme · 45 gün vade", amount: 210_000, date: "9 Ağu" },
];

export const EXPECTED_OUTGOING: ExpectedCashItem[] = [
  { id: "out-1", label: "Maaş ödemeleri (14 kişi)", subLabel: "Her ayın 1'i", amount: -386_000, date: "1 Ağu" },
  { id: "out-2", label: "KDV beyannamesi", subLabel: "Vergi takvimi", amount: -118_400, date: "26 Tem" },
  { id: "out-3", label: "Kira — Merkez Depo", subLabel: "Her ayın 15'i", amount: -85_000, date: "15 Ağu" },
  { id: "out-4", label: "Anadolu Ambalaj", subLabel: "Ort. aylık tedarik", amount: -180_000, date: "Ağu boyunca" },
];

export const REPORT_PACKAGES: ReportPackage[] = [
  {
    id: "rep-1",
    period: "2026 · 2. Çeyrek",
    status: "Mühürlü",
    summary: "683 hareket · 4 banka · Logo Tiger mutabakat ekiyle · PDF 42 sayfa + Excel",
    sha256: "8f3a…c91d",
    generatedAt: "01 Tem 2026 09:14",
  },
  {
    id: "rep-2",
    period: "2026 · 1. Çeyrek",
    status: "Mühürlü",
    summary: "714 hareket · 4 banka · vergi denetimi için hazırlandı, YMM ile paylaşıldı",
    sha256: "2b7e…04af",
    generatedAt: "02 Nis 2026 10:02",
  },
  {
    id: "rep-3",
    period: "2025 · Yıllık",
    status: "Arşiv",
    summary: "2.841 hareket · e-Defter çapraz kontrol raporu dahil",
    sha256: "e19c…77b2",
    generatedAt: "05 Oca 2026 11:40",
  },
];

export const CLIENTS: ClientSummary[] = [
  { id: "cl-1", name: "Demir Ticaret A.Ş.", sector: "Toptan gıda", bankCount: 4, pendingExceptions: 12, consentStatus: "Uyarı", consentDetail: "5 gün", lastSync: "2 dk önce" },
  { id: "cl-2", name: "Kaya Yapı Ltd.", sector: "İnşaat malzeme", bankCount: 3, pendingExceptions: 4, consentStatus: "Aktif", lastSync: "5 dk önce" },
  { id: "cl-3", name: "Arel Elektronik", sector: "Perakende", bankCount: 2, pendingExceptions: 0, consentStatus: "Aktif", lastSync: "1 dk önce" },
  { id: "cl-4", name: "Yıldız Tekstil San.", sector: "İmalat", bankCount: 5, pendingExceptions: 2, consentStatus: "Aktif", lastSync: "8 dk önce" },
  { id: "cl-5", name: "Mavi Otel İşletmeleri", sector: "Turizm", bankCount: 3, pendingExceptions: 0, consentStatus: "Süresi doldu", lastSync: "3 gün önce" },
  { id: "cl-6", name: "Çınar Lojistik", sector: "Taşımacılık", bankCount: 2, pendingExceptions: 1, consentStatus: "Aktif", lastSync: "şimdi" },
];

export const ASSISTANT_SUGGESTIONS = [
  "Bu tedarikçiyle sözleşme ortalaması ne?",
  "Temmuz tahmini gider?",
  "En büyük 5 müşterim kim?",
];

export const ASSISTANT_HISTORY: AssistantExchange[] = [
  {
    id: "asst-1",
    question: "Geçen ay Anadolu Ambalaj'a ne kadar ödedik?",
    answeredAt: "Haziran 2026",
    scannedAccounts: 3,
    responseMs: 400,
    answer:
      "Haziran'da Anadolu Ambalaj San. Tic. A.Ş.'ye toplam ₺186.400,00 ödediniz — 4 işlemde, tamamı İş Bankası ****8821 hesabından. Mayıs'a göre %12 daha fazla.",
    highlightAmount: "₺186.400,00",
    highlightNote: "%12 daha fazla",
    rows: [
      { date: "3 Haz", channel: "EFT", ref: "FTR-2026-0981", amount: 46_600 },
      { date: "10 Haz", channel: "EFT", ref: "FTR-2026-1004", amount: 46_600 },
      { date: "19 Haz", channel: "EFT", ref: "FTR-2026-1055", amount: 52_400 },
      { date: "27 Haz", channel: "EFT", ref: "FTR-2026-1090", amount: 40_800 },
    ],
  },
];

export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  { id: "notif-1", title: "Günlük özet — WhatsApp", description: "Her sabah 08:30 · nakit durumu + dikkat gereken hareketler", enabled: true },
  { id: "notif-2", title: "Günlük özet — e-posta", description: "selin@demirticaret.com.tr", enabled: true },
  { id: "notif-3", title: "Anomali uyarıları", description: "Alışılmadık tutar veya yeni karşı taraf anında bildirilsin", enabled: true },
  { id: "notif-4", title: "Rıza süresi hatırlatması", description: "Dolmadan 7, 3 ve 1 gün önce", enabled: true },
  { id: "notif-5", title: "Her hareket için anlık bildirim", description: "Yoğun hesaplarda gürültü yaratabilir", enabled: false },
];

export const AVAILABLE_BANKS_TO_CONNECT: { id: BankId; name: string }[] = BANKS.map((b) => ({
  id: b.id,
  name: b.name,
}));
