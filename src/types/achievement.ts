import type { AchievementId } from "@/constants/achievements";
import type { ISODateString } from "./common";

export interface UserAchievement {
  id: AchievementId;
  earnedAt: ISODateString;
}
