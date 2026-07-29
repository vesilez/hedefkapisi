import type { UserRole } from "@/constants/roles";
import type { Nullable } from "./common";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  surname: string;
  avatarUrl: Nullable<string>;
  role: UserRole;
  score: number;
  achievementCount: number;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number;
}

export interface LeaderboardData {
  topUsers: RankedLeaderboardEntry[];
  currentUser: RankedLeaderboardEntry | null;
}
