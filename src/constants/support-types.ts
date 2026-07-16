export const SUPPORT_TYPES = [
  "mentorship",
  "software",
  "design",
  "business_model",
  "education",
  "team_member",
  "equipment",
  "financial",
  "internship",
  "academic",
  "promotion",
  "company_visit",
] as const;

export type SupportType = (typeof SUPPORT_TYPES)[number];

export const SUPPORT_TYPE_LABELS = {
  mentorship: "Mentorluk",
  software: "Yazılım",
  design: "Tasarım",
  business_model: "İş Modeli",
  education: "Eğitim",
  team_member: "Ekip Üyesi",
  equipment: "Ekipman",
  financial: "Finansal Destek",
  internship: "Staj",
  academic: "Akademik Destek",
  promotion: "Tanıtım",
  company_visit: "Şirket Ziyareti",
} as const satisfies Record<SupportType, string>;

export const SUPPORT_TYPE_MVP_ENABLED = {
  mentorship: true,
  software: true,
  design: true,
  business_model: true,
  education: true,
  team_member: true,
  equipment: true,
  financial: false,
  internship: true,
  academic: true,
  promotion: true,
  company_visit: true,
} as const satisfies Record<SupportType, boolean>;

export function isSupportType(value: unknown): value is SupportType {
  return (
    typeof value === "string" &&
    SUPPORT_TYPES.some((supportType) => supportType === value)
  );
}
