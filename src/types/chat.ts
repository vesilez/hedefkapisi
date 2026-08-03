import type { ISODateString, Nullable } from "./common";

export interface Chat {
  id: string;
  supportRequestId: string;
  ideaId: string;
  ideaTitle: string;
  ownerId: string;
  supporterId: string;
  participantIds: string[];
  participantRoles: Record<string, "student" | "supporter" | "mentor" | "sponsor">;
  mentorshipId: Nullable<string>;
  type: "support" | "mentorship" | "sponsorship";
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastMessage: Nullable<string>;
  lastMessageAt: Nullable<ISODateString>;
  unreadCounts: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: ISODateString;
  readBy: string[];
  status: "sent";
}
