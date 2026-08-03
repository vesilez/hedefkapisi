import type { ISODateString, Nullable } from "./common";

export const MEETING_STATUSES = ["pending", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface Meeting {
  id: string;
  conversationId: string;
  ideaId: string;
  title: string;
  description: string;
  participantIds: string[];
  organizerId: string;
  startAt: ISODateString;
  endAt: ISODateString;
  location: Nullable<string>;
  meetingUrl: Nullable<string>;
  status: MeetingStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateMeetingInput {
  conversationId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  meetingUrl?: string;
}
