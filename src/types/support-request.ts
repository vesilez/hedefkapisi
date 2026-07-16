import type { SupportType } from "@/constants/support-types";
import type { BaseEntity, EntityId, ISODateString, Nullable } from "./common";

export const SUPPORT_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "matched",
  "cancelled",
] as const;
export type SupportRequestStatus = (typeof SUPPORT_REQUEST_STATUSES)[number];

export interface SupportRequest extends BaseEntity {
  ideaId: EntityId;
  supporterId: EntityId;
  supportTypes: SupportType[];
  message: string;
  status: SupportRequestStatus;
  adminNote: Nullable<string>;
  reviewedBy: Nullable<EntityId>;
  reviewedAt: Nullable<ISODateString>;
}

export interface CreateSupportRequestInput {
  ideaId: EntityId;
  supporterId: EntityId;
  supportTypes: SupportType[];
  message: string;
}

export interface SupportRequestListItem {
  id: EntityId;
  ideaId: EntityId;
  supporterId: EntityId;
  supportTypes: SupportType[];
  message: string;
  status: SupportRequestStatus;
  createdAt: ISODateString;
}
