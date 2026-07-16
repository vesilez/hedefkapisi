export const IDEA_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "revision_requested",
  "archived",
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_STATUS_LABELS = {
  draft: "Taslak",
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  revision_requested: "Revizyon İstendi",
  archived: "Arşivlendi",
} as const satisfies Record<IdeaStatus, string>;

export function isIdeaStatus(value: unknown): value is IdeaStatus {
  return (
    typeof value === "string" &&
    IDEA_STATUSES.some((status) => status === value)
  );
}
