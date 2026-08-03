import type { IdeaListItem } from "./idea";

export type MatchRole = "sponsor" | "mentor" | "supporter";

export interface IdeaMatch {
  idea: IdeaListItem;
  score: number;
  reasons: string[];
}
