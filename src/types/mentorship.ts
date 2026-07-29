import type { ISODateString, Nullable } from "./common";
import type { IdeaListItem } from "./idea";

export const MENTORSHIP_STATUSES = [
  "pending",
  "active",
  "rejected",
  "completed",
  "cancelled",
] as const;
export type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];

export interface PublicMentorProfile {
  mentorId: string;
  name: string;
  surname: string;
  avatarUrl: Nullable<string>;
  city: Nullable<string>;
  profession: string;
  organization: string;
  expertiseAreas: string[];
  mentoringTopics: string[];
  availability: string;
  biography: string;
}

export interface Mentorship {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  message: string;
  focusAreas: string[];
  status: MentorshipStatus;
  chatId: Nullable<string>;
  respondedAt: Nullable<ISODateString>;
  completedAt: Nullable<ISODateString>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MentorNote {
  id: string;
  mentorshipId: string;
  mentorId: string;
  studentId: string;
  content: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MentorEvaluation {
  id: string;
  mentorshipId: string;
  mentorId: string;
  studentId: string;
  progress: number;
  summary: string;
  nextSteps: string;
  createdAt: ISODateString;
}

export interface MentorStudent extends Mentorship {
  ideas: IdeaListItem[];
  notes: MentorNote[];
  evaluations: MentorEvaluation[];
}

export interface MentorDashboardData {
  pending: Mentorship[];
  active: MentorStudent[];
  completed: Mentorship[];
  rejected: number;
}
