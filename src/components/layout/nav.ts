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
    label: "İşletme",
    items: [
      { label: "Genel bakış", path: "/" },
      { label: "Hareketler", path: "/hareketler" },
      { label: "Bakiyeler", path: "/bakiyeler" },
      { label: "Ödeme tetikleme", path: "/odeme-tetikleme", badgeKey: "approvals" },
      { label: "Otomatik ödeme", path: "/otomatik-odeme" },
      { label: "Tahsilat", path: "/tahsilat" },
      { label: "Mutabakat", path: "/mutabakat", badgeKey: "reconciliation" },
      { label: "Nakit akışı", path: "/nakit-akisi" },
      { label: "Asistan", path: "/asistan" },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { label: "Raporlar & denetim", path: "/raporlar" },
      { label: "Rızalar & bildirimler", path: "/rizalar", badgeKey: "consents" },
      { label: "Geliştirici / API", path: "/gelistirici" },
      { label: "Admin panel", path: "/admin" },
    ],
  },
  {
    label: "Muhasebeci",
    items: [{ label: "Müşteri paneli", path: "/musteri-paneli" }],
  },
  {
    label: "Vitrin",
    items: [
      { label: "Kurulum sihirbazı", path: "/kurulum" },
      { label: "Mobil uygulama", path: "/mobil" },
    ],
  },
];
