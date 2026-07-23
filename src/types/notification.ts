import type { ISODateString } from "./common";

export const NOTIFICATION_TYPES = [
  "idea_approved",
  "idea_rejected",
  "support_request_received",
  "support_request_approved",
  "support_request_rejected",
  "new_idea",
  "new_support_request",
  "idea_comment",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: ISODateString;
}
