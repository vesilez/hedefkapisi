export const siteConfig = {
  name: "Hedef Kapısı",
  shortDescription: "Gençlerin hayallerini desteğe dönüştüren buluşma noktası.",
  description:
    "Lise ve üniversite öğrencilerinin hayallerini, fikirlerini ve çözüm önerilerini paylaşabildiği; mentor, destekçi ve kurumlarla güvenli biçimde buluşabildiği platform.",
  contactEmail: "iletisim@example.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  socialLinks: {} as Record<string, string>,
} as const;
