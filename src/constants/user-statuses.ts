export const USER_STATUSES = [
  "active",
  "inactive",
  "pending",
  "suspended",
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS = {
  active: "Aktif",
  inactive: "Pasif",
  pending: "Onay Bekliyor",
  suspended: "Askıya Alındı",
} as const satisfies Record<UserStatus, string>;
