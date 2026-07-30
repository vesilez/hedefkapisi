import type { IdeaStatus } from "@/constants/idea-statuses";
import type { UserRole } from "@/constants/roles";

export interface DailyAnalyticsPoint {
  date: string;
  label: string;
  count: number;
}

export interface DistributionPoint<TName extends string> {
  name: TName;
  label: string;
  value: number;
}

export interface PopularIdeaPoint {
  id: string;
  title: string;
  likeCount: number;
}

export interface AdminAnalytics {
  userRegistrations: DailyAnalyticsPoint[];
  ideaCreations: DailyAnalyticsPoint[];
  supportRequests: DailyAnalyticsPoint[];
  categoryDistribution: DistributionPoint<string>[];
  ideaStatusDistribution: DistributionPoint<
    Extract<IdeaStatus, "pending" | "approved" | "rejected">
  >[];
  userRoleDistribution: DistributionPoint<UserRole>[];
  mostLikedIdeas: PopularIdeaPoint[];
}

export const ADMIN_ACTIVITY_TYPES = [
  "idea_created",
  "support_requested",
  "user_registered",
  "comment_created",
] as const;

export type AdminActivityType = (typeof ADMIN_ACTIVITY_TYPES)[number];

export interface AdminActivity {
  id: string;
  type: AdminActivityType;
  userName: string;
  relatedTitle: string;
  createdAt: string;
  href: `/${string}`;
}
