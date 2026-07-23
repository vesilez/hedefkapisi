import type { Idea } from "./idea";
import type { FavoriteIdeaItem } from "./idea-engagement";
import type { CommentStatus } from "./comment";
import type { SupportRequestStatus } from "./support-request";
import type { SupportType } from "@/constants/support-types";
import type { UserWithProfiles } from "./user";

export interface ProfileCommentActivity {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  ideaTitle: string;
  ideaSlug: string | null;
}

export interface ProfileSupportActivity {
  id: string;
  supportTypes: SupportType[];
  status: SupportRequestStatus;
  adminNote: string | null;
  createdAt: string;
  ideaTitle: string;
  ideaSlug: string | null;
}

export interface ProfileDashboardStatistics {
  sharedIdeas: number;
  approvedIdeas: number;
  favorites: number;
  comments: number;
  supportRequests: number;
}

export interface ProfileDashboardData {
  profile: UserWithProfiles;
  ideas: Idea[];
  favorites: FavoriteIdeaItem[];
  comments: ProfileCommentActivity[];
  supportRequests: ProfileSupportActivity[];
  statistics: ProfileDashboardStatistics;
}
