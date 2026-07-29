export const FEEDBACK_TYPES = ["bug", "suggestion", "satisfaction"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_STATUSES = ["open", "reviewing", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export interface PilotFeedback {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  pagePath: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
