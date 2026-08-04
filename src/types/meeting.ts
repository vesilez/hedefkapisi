import type { ISODateString, Nullable } from "./common";

export const MEETING_STATUSES = ["pending", "accepted", "rejected", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];
export const MEETING_TYPES = ["online", "phone", "face_to_face"] as const;
export type MeetingType = (typeof MEETING_TYPES)[number];

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
  meetingType: MeetingType;
  meetingProvider: "jitsi" | null;
  meetingRoomId: Nullable<string>;
  meetingLink: Nullable<string>;
  /** @deprecated Legacy custom online link. */
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
  meetingType: MeetingType;
}
