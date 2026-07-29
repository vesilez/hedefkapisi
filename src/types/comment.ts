import type { UserRole } from "@/constants/roles";
import type { ISODateString, Nullable } from "./common";

export const COMMENT_STATUSES = ["active", "hidden"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface IdeaComment {
  id: string;
  ideaId: string;
  userId: string;
  userName: string;
  userAvatarUrl: Nullable<string>;
  userRole: UserRole;
  content: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  status: CommentStatus;
}
