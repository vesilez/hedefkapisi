import type { DailyAnalyticsPoint } from "./admin-analytics";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalUsers: number;
  dailyNewUsers: number;
}

export interface RankedIdeaMetric {
  id: string;
  title: string;
  slug: string;
  value: number;
}

export interface ActiveEntityMetric {
  id: string;
  name: string;
  activityCount: number;
}

export interface CategorySupportMetric {
  id: string;
  label: string;
  supportCount: number;
}

export interface AdminAnalyticsReport {
  range: AnalyticsDateRange;
  generatedAt: string;
  metrics: AnalyticsMetrics;
  userGrowth: DailyAnalyticsPoint[];
  ideaGrowth: DailyAnalyticsPoint[];
  supportGrowth: DailyAnalyticsPoint[];
  mostViewedIdeas: RankedIdeaMetric[];
  mostLikedIdeas: RankedIdeaMetric[];
  mostActiveMentors: ActiveEntityMetric[];
  mostActiveSponsors: ActiveEntityMetric[];
  mostSupportedCategories: CategorySupportMetric[];
}
