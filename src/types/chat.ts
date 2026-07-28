import type { ISODateString, Nullable } from "./common";

export interface Chat {
  id: string;
  supportRequestId: string;
  ideaId: string;
  ideaTitle: string;
  ownerId: string;
  supporterId: string;
  participantIds: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastMessage: Nullable<string>;
  lastMessageAt: Nullable<ISODateString>;
  unreadCounts: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: ISODateString;
  readBy: string[];
}
