import "client-only";

import { ACHIEVEMENT_IDS, type AchievementId } from "@/constants/achievements";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import type { Idea } from "@/types/idea";
import type { SupportRequest } from "@/types/support-request";
import type { UserAchievement } from "@/types/achievement";
import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type Transaction,
} from "firebase/firestore";

function isFirestoreTimestamp(value: unknown): value is {
  toDate: () => Date;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  );
}

function achievementTimestamp(value: unknown): Date | null {
  if (isFirestoreTimestamp(value)) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value !== "object" || value === null) return null;

  const unlocked: unknown = Reflect.get(value, "unlocked");
  const unlockedAt: unknown = Reflect.get(value, "unlockedAt");
  if (unlocked !== true || !isFirestoreTimestamp(unlockedAt)) return null;
  const date = unlockedAt.toDate();
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

function isUnlockedRecord(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "unlocked") === true &&
    achievementTimestamp(value) !== null
  );
}

export function hasAchievement(
  userData: DocumentData,
  achievementId: AchievementId,
): boolean {
  const achievements: unknown = userData.achievements;
  if (typeof achievements !== "object" || achievements === null) return false;
  return (
    achievementTimestamp(Reflect.get(achievements, achievementId)) !== null
  );
}

export function grantAchievementInTransaction(
  transaction: Transaction,
  userId: string,
  userData: DocumentData,
  achievementId: AchievementId,
): boolean {
  const rawAchievements: unknown = userData.achievements;
  const currentValue =
    typeof rawAchievements === "object" && rawAchievements !== null
      ? Reflect.get(rawAchievements, achievementId)
      : undefined;
  if (isUnlockedRecord(currentValue)) return false;

  transaction.update(
    doc(db, "users", userId),
    new FieldPath("achievements", achievementId),
    {
      unlocked: true,
      unlockedAt: isFirestoreTimestamp(currentValue)
        ? currentValue
        : serverTimestamp(),
    },
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
    const date = achievementTimestamp(value);
    if (date) achievements.push({ id, earnedAt: date.toISOString() });
  }
  return achievements.sort((first, second) =>
    second.earnedAt.localeCompare(first.earnedAt),
  );
}

interface AchievementBackfillData {
  ideas: Idea[];
  supportRequests: SupportRequest[];
}

export async function reconcileUserAchievements(
  userId: string,
  data: AchievementBackfillData,
): Promise<UserAchievement[]> {
  if (!userId || auth.currentUser?.uid !== userId) return [];

  const unlocked = new Set<AchievementId>();
  if (data.ideas.some((idea) => idea.status !== "draft")) {
    unlocked.add("first_dream");
  }
  const hasReceivedLike = data.ideas.some((idea) => idea.likeCount > 0);
  if (hasReceivedLike) {
    unlocked.add("first_like");
  }
  if (data.supportRequests.some((request) => request.status === "approved")) {
    unlocked.add("first_support");
  }

  const chats = await getDocs(
    query(
      collection(db, "chats"),
      where("participantIds", "array-contains", userId),
      limit(1),
    ),
  );
  if (!chats.empty) unlocked.add("first_chat");

  if (unlocked.size > 0) {
    await runTransaction(db, async (transaction) => {
      const userReference = doc(db, "users", userId);
      const userSnapshot = await transaction.get(userReference);
      if (!userSnapshot.exists()) return;

      for (const achievementId of unlocked) {
        grantAchievementInTransaction(
          transaction,
          userId,
          userSnapshot.data(),
          achievementId,
        );
      }
    });
  }

  const updatedUser = await getDoc(doc(db, "users", userId));
  return updatedUser.exists() ? parseAchievements(updatedUser.data()) : [];
}
