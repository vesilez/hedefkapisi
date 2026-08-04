import type { IdeaListItem } from "./idea";

export type MatchRole = "sponsor" | "mentor" | "supporter";

export interface IdeaMatch {
  idea: IdeaListItem;
  score: number;
  reasons: string[];
}

export interface MatchingAnalytics {
  byRole: Array<{ role: MatchRole; recommendationCount: number; averageScore: number }>;
  topCategories: Array<{ categoryId: string; count: number }>;
}
