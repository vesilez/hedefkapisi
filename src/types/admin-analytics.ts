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
  ideaStatusDistribution: DistributionPoint<
    Extract<IdeaStatus, "pending" | "approved" | "rejected">
  >[];
  userRoleDistribution: DistributionPoint<UserRole>[];
  mostLikedIdeas: PopularIdeaPoint[];
}
