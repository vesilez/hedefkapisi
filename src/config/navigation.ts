export const mainNavigation = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Hayaller", href: "/hayaller" },
  { label: "Liderlik", href: "/liderlik" },
  { label: "Mentorlar", href: "/mentorlar" },
  { label: "Sponsorlar", href: "/sponsorlar" },
  { label: "Hayalini Paylaş", href: "/hayalini-paylas" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "SSS", href: "/sss" },
] as const;

export const adminNavigation = [
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Genel Bakış", href: "/admin" },
  { label: "Hayaller", href: "/admin/hayaller" },
  { label: "Kullanıcılar", href: "/admin/kullanicilar" },
  { label: "Destek Başvuruları", href: "/admin/destek-basvurulari" },
  { label: "Mentorluklar", href: "/admin/mentorluklar" },
  { label: "Sponsorlar", href: "/admin/sponsorlar" },
  { label: "Geri Bildirimler", href: "/admin/geri-bildirimler" },
] as const;
