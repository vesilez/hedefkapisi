import "client-only";

import { ACHIEVEMENT_IDS, type AchievementId } from "@/constants/achievements";
import { db } from "@/lib/firebase/firestore";
import type { UserAchievement } from "@/types/achievement";
import {
  doc,
  FieldPath,
  serverTimestamp,
  type DocumentData,
  type Transaction,
} from "firebase/firestore";

export function hasAchievement(
  userData: DocumentData,
  achievementId: AchievementId,
): boolean {
  const achievements: unknown = userData.achievements;
  return (
    typeof achievements === "object" &&
    achievements !== null &&
    achievementId in achievements
  );
}

export function grantAchievementInTransaction(
  transaction: Transaction,
  userId: string,
  userData: DocumentData,
  achievementId: AchievementId,
): boolean {
  if (hasAchievement(userData, achievementId)) return false;

  transaction.update(
    doc(db, "users", userId),
    new FieldPath("achievements", achievementId),
    serverTimestamp(),
  );
  return true;
}

export function parseAchievements(userData: DocumentData): UserAchievement[] {
  const rawAchievements: unknown = userData.achievements;
  if (typeof rawAchievements !== "object" || rawAchievements === null)
    return [];

  const achievements: UserAchievement[] = [];
  for (const id of ACHIEVEMENT_IDS) {
    const value: unknown = Reflect.get(rawAchievements, id);
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof value.toDate === "function"
    ) {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        achievements.push({ id, earnedAt: date.toISOString() });
      }
    }
  }
  return achievements.sort((first, second) =>
    second.earnedAt.localeCompare(first.earnedAt),
  );
}
