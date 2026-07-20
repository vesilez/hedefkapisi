import type { SupportType } from "@/constants/support-types";
import type { SupportRequestStatus } from "@/constants/support-request-statuses";
import type { BaseEntity, EntityId, ISODateString, Nullable } from "./common";

export type { SupportRequestStatus } from "@/constants/support-request-statuses";
export { SUPPORT_REQUEST_STATUSES } from "@/constants/support-request-statuses";

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
