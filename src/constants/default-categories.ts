export const DEFAULT_CATEGORIES = [
  { id: "ai", label: "Yapay Zeka" },
  { id: "software", label: "Yazılım / Mobil Uygulama" },
  { id: "education", label: "Eğitim" },
  { id: "health", label: "Sağlık" },
  { id: "agriculture", label: "Tarım Teknolojileri" },
  { id: "environment", label: "Çevre / Sürdürülebilirlik" },
  { id: "social_enterprise", label: "Sosyal Girişim" },
  { id: "game", label: "Oyun" },
  { id: "robotics", label: "Robotik" },
  { id: "tourism", label: "Turizm" },
  { id: "culture_art", label: "Kültür / Sanat" },
  { id: "accessibility", label: "Engellilere Yönelik Çözümler" },
  { id: "other", label: "Diğer" },
] as const;

export type DefaultCategoryId = (typeof DEFAULT_CATEGORIES)[number]["id"];

export const DEFAULT_CATEGORY_IDS = [
  "ai",
  "software",
  "education",
  "health",
  "agriculture",
  "environment",
  "social_enterprise",
  "game",
  "robotics",
  "tourism",
  "culture_art",
  "accessibility",
  "other",
] as const satisfies readonly DefaultCategoryId[];
