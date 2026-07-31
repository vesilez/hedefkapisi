import type { SupportType } from "@/constants/support-types";
import type { SupportRequestStatus } from "@/constants/support-request-statuses";
import type { UserRole } from "@/constants/roles";
import type { BaseEntity, EntityId, ISODateString, Nullable } from "./common";

export type { SupportRequestStatus } from "@/constants/support-request-statuses";
export { SUPPORT_REQUEST_STATUSES } from "@/constants/support-request-statuses";

export const SUPPORT_APPLICATION_TYPES = [
  "support",
  "mentorship",
  "sponsorship",
] as const;
export type SupportApplicationType = (typeof SUPPORT_APPLICATION_TYPES)[number];

export const CONTACT_PREFERENCES = ["platform", "email", "phone"] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export interface SupportRequest extends BaseEntity {
  ideaId: EntityId;
  supporterId: EntityId;
  supportTypes: SupportType[];
  applicationType: SupportApplicationType;
  applicantRole: Extract<UserRole, "supporter" | "mentor" | "sponsor">;
  message: string;
  contactPreference: ContactPreference;
  contributionDetails: Nullable<string>;
  status: SupportRequestStatus;
  adminNote: Nullable<string>;
  reviewedBy: Nullable<EntityId>;
  reviewedAt: Nullable<ISODateString>;
}

export interface CreateSupportRequestInput {
  ideaId: EntityId;
  supportTypes: SupportType[];
  applicationType: SupportApplicationType;
  message: string;
  contactPreference: ContactPreference;
  contributionDetails: Nullable<string>;
}

export interface SupportRequestListItem {
  id: EntityId;
  ideaId: EntityId;
  supporterId: EntityId;
  supportTypes: SupportType[];
  applicationType: SupportApplicationType;
  applicantRole: Extract<UserRole, "supporter" | "mentor" | "sponsor">;
  message: string;
  contactPreference: ContactPreference;
  contributionDetails: Nullable<string>;
  status: SupportRequestStatus;
  createdAt: ISODateString;
}
