import type { ISODateString } from "./common";

export const NOTIFICATION_TYPES = [
  "support_request",
  "support_approved",
  "support_rejected",
  "new_message",
  "meeting_created",
  "meeting_updated",
  "meeting_cancelled",
  "meeting_reminder",
  "idea_approved",
  "mentor_request",
  // Legacy event names are kept so existing documents remain readable.
  "idea_rejected",
  "support_request_received",
  "support_request_approved",
  "support_request_rejected",
  "new_idea",
  "new_support_request",
  "idea_comment",
  "idea_liked",
  "chat_message",
  "admin_activity",
  "sponsor_approved",
  "sponsor_support_received",
  "sponsorship_offer_approved",
  "sponsorship_offer_rejected",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  read: boolean;
  createdAt: ISODateString;
}
