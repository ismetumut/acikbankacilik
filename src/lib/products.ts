/**
 * Finrota ürün yapısı — sol ürün rayı (6 ürün) + her ürünün kendi menüsü.
 * Menüler gerçek Finrota portalından birebir alınmıştır; path'ler /{ürün}/{sayfa}.
 * `comp` alanı hangi React bileşeninin yükleneceğini belirler; boşsa yer tutucu.
 */

export type BadgeKey = "approvals" | "reconciliation" | "consents";

export interface MenuNode {
  label: string;
  path?: string; // yaprak öğe → route
  comp?: string; // route'a bağlı bileşen anahtarı (App.tsx map'i)
  badgeKey?: BadgeKey;
  children?: MenuNode[];
}

export interface Product {
  id: string;
  code: string; // ray kısaltması: NTE, PSR...
  name: string; // logo alt başlığı: Netekstre, Posrapor...
  menu: MenuNode[];
}

export const PRODUCTS: Product[] = [
  {
    id: "nte",
    code: "NTE",
    name: "Netekstre",
    menu: [
      { label: "Anasayfa", path: "/nte", comp: "Overview" },
      {
        label: "Banka Hesapları",
        children: [
          { label: "Hareketler", path: "/nte/hareketler", comp: "Transactions" },
          { label: "Bakiyeler", path: "/nte/bakiyeler", comp: "Balances" },
          { label: "Sorgulama Detayları", path: "/nte/sorgulama" },
        ],
      },
      {
        label: "Kredi Kartları",
        children: [
          { label: "Hesap Özeti", path: "/nte/kart-ozet" },
          { label: "İşlemler", path: "/nte/kart-islemler" },
        ],
      },
      {
        label: "Mutabakat",
        children: [{ label: "AI Eşleştirme", path: "/nte/mutabakat", comp: "Reconciliation", badgeKey: "reconciliation" }],
      },
      {
        label: "Banka Başvuruları",
        children: [{ label: "Kurulum Sihirbazı", path: "/nte/kurulum", comp: "OnboardingWizard" }],
      },
      {
        label: "Tanımlar",
        children: [
          { label: "Banka Parametreleri", path: "/nte/banka-parametreleri" },
          { label: "Kredi Kartı Parametreleri", path: "/nte/kk-parametreleri" },
          { label: "Kurallar", path: "/nte/kurallar" },
          { label: "Hareket Kategorileri", path: "/nte/kategoriler" },
          { label: "Bildirimler", path: "/nte/bildirimler", comp: "Consents", badgeKey: "consents" },
        ],
      },
      {
        label: "Raporlar",
        children: [
          { label: "Banka Devir Raporu", path: "/nte/devir-raporu" },
          { label: "Ortalama Banka Raporu", path: "/nte/ortalama-rapor", comp: "Reports" },
        ],
      },
    ],
  },
  {
    id: "psr",
    code: "PSR",
    name: "Posrapor",
    menu: [
      { label: "Anasayfa", path: "/psr" },
      { label: "Parametreler", path: "/psr/parametreler" },
      { label: "Pos Listesi", path: "/psr/pos-listesi" },
      { label: "Kart Hareketleri", path: "/psr/kart-hareketleri" },
      { label: "Kart Hareketleri Detay", path: "/psr/kart-detay" },
      { label: "Komisyon Yönetimi", path: "/psr/komisyon" },
      { label: "Dosya ile Mutabakat", path: "/psr/dosya-mutabakat" },
      {
        label: "Raporlama",
        children: [
          { label: "Özet Rapor", path: "/psr/ozet-rapor" },
          { label: "Detay Rapor", path: "/psr/detay-rapor" },
          { label: "Komisyon Raporu", path: "/psr/komisyon-raporu" },
          { label: "Mükerrerlik / Fraud Raporu", path: "/psr/fraud-raporu" },
          { label: "Detaylı Karşılaştırma Raporu", path: "/psr/karsilastirma" },
        ],
      },
    ],
  },
  {
    id: "dbs",
    code: "DBS",
    name: "E-DBS",
    menu: [
      { label: "Anasayfa", path: "/dbs" },
      { label: "Bayi Bilgileri", path: "/dbs/bayi-bilgileri" },
      { label: "Bayi Kullanıcıları", path: "/dbs/bayi-kullanicilari" },
      { label: "Talimat Hazırla", path: "/dbs/talimat-hazirla" },
      { label: "Talimat Listesi", path: "/dbs/talimat-listesi" },
      { label: "Parametreler", path: "/dbs/parametreler" },
      { label: "Raporlama", path: "/dbs/raporlama" },
      { label: "Fatura Karşılaştırma Raporu", path: "/dbs/fatura-karsilastirma" },
    ],
  },
  {
    id: "tos",
    code: "TÖS",
    name: "TÖS",
    menu: [
      { label: "Anasayfa", path: "/tos", comp: "PaymentInitiation", badgeKey: "approvals" },
      { label: "Parametreler", path: "/tos/parametreler" },
      { label: "Alıcı Hesaplar", path: "/tos/alici-hesaplar" },
      { label: "Ödeme Hazırla", path: "/tos/odeme-hazirla", comp: "PaymentInitiation", badgeKey: "approvals" },
      { label: "Düzenli Ödeme Talimatı", path: "/tos/duzenli-odeme", comp: "AutoPayments" },
      { label: "Ödeme Listeleme", path: "/tos/odeme-listeleme" },
      { label: "Onay Bekleyen Ödemeler", path: "/tos/onay-bekleyen" },
      { label: "Raporlama", path: "/tos/raporlama" },
    ],
  },
  {
    id: "nap",
    code: "NAP",
    name: "NAP",
    menu: [
      { label: "Anasayfa", path: "/nap", comp: "CashFlow" },
      { label: "İşlem Listesi", path: "/nap/islem-listesi" },
      { label: "Hesaplar", path: "/nap/hesaplar" },
      { label: "Senaryolar", path: "/nap/senaryolar" },
      { label: "Bütçe", path: "/nap/butce" },
    ],
  },
  {
    id: "nth",
    code: "NTH",
    name: "Netahsilat",
    menu: [
      { label: "Anasayfa", path: "/nth", comp: "Collections" },
      {
        label: "Pos Yönetimi",
        children: [
          { label: "Ödeme Al", path: "/nth/odeme-al" },
          { label: "Bayi Pos Yönetimi", path: "/nth/bayi-pos" },
        ],
      },
      { label: "İşlemler", path: "/nth/islemler" },
      { label: "İşlemler Detay", path: "/nth/islemler-detay" },
      { label: "Ödeme Linki Listesi", path: "/nth/odeme-linki" },
      { label: "Mail Sms Takip", path: "/nth/mail-sms" },
      { label: "Kart Listesi", path: "/nth/kart-listesi" },
      { label: "Müşteriler ve Bayiler", path: "/nth/musteriler-bayiler" },
      {
        label: "Raporlar",
        children: [{ label: "Tahsilat Raporu", path: "/nth/tahsilat-raporu" }],
      },
      {
        label: "Tanımlar",
        children: [{ label: "Parametreler", path: "/nth/parametreler" }],
      },
    ],
  },
];

/** Ürün rayı altındaki genel (ürün-üstü) araçlar. */
export const GLOBAL_TOOLS: MenuNode[] = [
  { label: "Geliştirici / API", path: "/gelistirici", comp: "DeveloperPortal" },
  { label: "Admin panel", path: "/admin", comp: "AdminPanel" },
  { label: "Asistan", path: "/asistan", comp: "Assistant" },
  { label: "Müşteri paneli", path: "/musteri-paneli", comp: "ClientPanel" },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Bir path hangi ürüne ait? (rayda aktif ürünü bulmak için) */
export function productForPath(pathname: string): Product | undefined {
  const seg = pathname.split("/")[1];
  return PRODUCTS.find((p) => p.id === seg);
}
