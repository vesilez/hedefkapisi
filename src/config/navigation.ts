export const mainNavigation = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Hayaller", href: "/hayaller" },
  { label: "Hayalini Paylaş", href: "/hayalini-paylas" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "SSS", href: "/sss" },
] as const;

export const adminNavigation = [
  { label: "Genel Bakış", href: "/admin" },
  { label: "Hayaller", href: "/admin/hayaller" },
  { label: "Kullanıcılar", href: "/admin/kullanicilar" },
  { label: "Destek Başvuruları", href: "/admin/destek-basvurulari" },
] as const;
