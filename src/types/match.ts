import type { BaseEntity, EntityId, ISODateString, Nullable } from "./common";

export const MATCH_TYPES = [
  "mentorship",
  "technical_support",
  "education",
  "equipment",
  "internship",
  "other",
] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

export const MATCH_STATUSES = [
  "pending",
  "active",
  "completed",
  "cancelled",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export interface Match extends BaseEntity {
  ideaId: EntityId;
  studentId: EntityId;
  supporterId: Nullable<EntityId>;
  mentorId: Nullable<EntityId>;
  matchType: MatchType;
  supportRequestId: Nullable<EntityId>;
  status: MatchStatus;
  startedAt: Nullable<ISODateString>;
  completedAt: Nullable<ISODateString>;
  adminNote: Nullable<string>;
  createdBy: EntityId;
}
