export const SUPPORT_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "matched",
  "cancelled",
] as const;

export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export const SUPPORT_REQUEST_STATUS_LABELS = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  matched: "Eşleştirildi",
  cancelled: "İptal Edildi",
} as const satisfies Record<SupportRequestStatus, string>;
