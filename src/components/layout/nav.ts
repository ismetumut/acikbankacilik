export interface NavItem {
  label: string;
  path: string;
  badgeKey?: "approvals" | "reconciliation" | "consents";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Genel",
    items: [
      { label: "Genel bakış", path: "/" },
      { label: "Nakit akışı", path: "/nakit-akisi" },
      { label: "Asistan", path: "/asistan" },
    ],
  },
  {
    label: "Hesap bilgisi (AIS)",
    items: [
      { label: "Bakiyeler", path: "/bakiyeler" },
      { label: "Hareketler", path: "/hareketler" },
    ],
  },
  {
    label: "Ödeme (PIS)",
    items: [
      { label: "Ödeme tetikleme", path: "/odeme-tetikleme", badgeKey: "approvals" },
      { label: "Otomatik ödeme", path: "/otomatik-odeme" },
    ],
  },
  {
    label: "Tahsilat",
    items: [{ label: "Tahsilat", path: "/tahsilat" }],
  },
  {
    label: "Mutabakat & rapor",
    items: [
      { label: "Mutabakat", path: "/mutabakat", badgeKey: "reconciliation" },
      { label: "Raporlar & denetim", path: "/raporlar" },
    ],
  },
  {
    label: "Kurulum & entegrasyon",
    items: [
      { label: "Kurulum sihirbazı", path: "/kurulum" },
      { label: "Rızalar & bildirimler", path: "/rizalar", badgeKey: "consents" },
      { label: "Geliştirici / API", path: "/gelistirici" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { label: "Admin panel", path: "/admin" },
      { label: "Müşteri paneli", path: "/musteri-paneli" },
      { label: "Mobil uygulama", path: "/mobil" },
    ],
  },
];
