import "client-only";

import { LEADERBOARD_LIMIT } from "@/constants/leaderboard";
import { USER_ROLES } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import type {
  LeaderboardData,
  LeaderboardEntry,
  RankedLeaderboardEntry,
} from "@/types/leaderboard";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type DocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import { z } from "zod";

export type LeaderboardResult =
  | { success: true; data: LeaderboardData }
  | { success: false; error: { code: string; message: string } };

export type ScoreEventType =
  "dream" | "support" | "comment" | "like" | "completed_support";

const leaderboardEntrySchema = z.object({
  userId: z.string().min(1),
  name: z.string(),
  surname: z.string(),
  avatarUrl: z.string().nullable().optional().default(null),
  role: z.enum(USER_ROLES),
  score: z.number().int().nonnegative(),
  achievementCount: z.number().int().nonnegative(),
});

function achievementCount(data: DocumentData): number {
  const achievements: unknown = data.achievements;
  if (typeof achievements !== "object" || achievements === null) return 0;
  return Object.values(achievements).filter(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      Reflect.get(value, "unlocked") === true,
  ).length;
}

function safeScore(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

export function applyScoreInTransaction(
  transaction: Transaction,
  userSnapshot: DocumentSnapshot<DocumentData>,
  eventType: ScoreEventType,
  sourceId: string,
  delta: number,
  achievementDelta = 0,
): void {
  if (!userSnapshot.exists()) throw new Error("leaderboard/user-not-found");

  const userId = userSnapshot.id;
  const data = userSnapshot.data();
  const eventId = `${eventType}__${sourceId}`;
  const nextScore = Math.max(0, safeScore(data.score) + delta);
  const nextAchievementCount = Math.max(
    0,
    achievementCount(data) + achievementDelta,
  );

  const eventReference = doc(db, "scoreEvents", eventId);
  if (delta < 0) {
    transaction.delete(eventReference);
  } else {
    transaction.set(eventReference, {
      id: eventId,
      type: eventType,
      sourceId,
      userId,
      points: delta,
      createdAt: serverTimestamp(),
    });
  }
  transaction.update(doc(db, "users", userId), {
    score: nextScore,
    lastScoreEventId: eventId,
  });
  transaction.set(
    doc(db, "leaderboard", userId),
    {
      userId,
      name: typeof data.name === "string" ? data.name : "",
      surname: typeof data.surname === "string" ? data.surname : "",
      avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl : null,
      role: data.role,
      score: nextScore,
      achievementCount: nextAchievementCount,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function rankEntries(entries: LeaderboardEntry[]): RankedLeaderboardEntry[] {
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getLeaderboard(): Promise<LeaderboardResult> {
  try {
    const currentUserId = auth.currentUser?.uid ?? null;
    if (currentUserId) {
      const userSnapshot = await getDoc(doc(db, "users", currentUserId));
      if (userSnapshot.exists()) {
        const user = userSnapshot.data();
        await setDoc(
          doc(db, "leaderboard", currentUserId),
          {
            userId: currentUserId,
            name: typeof user.name === "string" ? user.name : "",
            surname: typeof user.surname === "string" ? user.surname : "",
            avatarUrl:
              typeof user.avatarUrl === "string" ? user.avatarUrl : null,
            role: user.role,
            score: safeScore(user.score),
            achievementCount: achievementCount(user),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
    const snapshots = await getDocs(
      query(
        collection(db, "leaderboard"),
        orderBy("score", "desc"),
        limit(LEADERBOARD_LIMIT),
      ),
    );
    const entries = snapshots.docs.flatMap((snapshot) => {
      const parsed = leaderboardEntrySchema.safeParse(snapshot.data());
      return parsed.success ? [parsed.data] : [];
    });
    const topUsers = rankEntries(entries);

    let currentUser =
      topUsers.find((entry) => entry.userId === currentUserId) ?? null;
    if (currentUserId && !currentUser) {
      const allSnapshots = await getDocs(
        query(
          collection(db, "leaderboard"),
          orderBy("score", "desc"),
        ),
      );
      const allEntries = rankEntries(
        allSnapshots.docs.flatMap((snapshot) => {
          const parsed = leaderboardEntrySchema.safeParse(snapshot.data());
          return parsed.success ? [parsed.data] : [];
        }),
      );
      currentUser =
        allEntries.find((entry) => entry.userId === currentUserId) ?? null;
    }

    return { success: true, data: { topUsers, currentUser } };
  } catch (error: unknown) {
    return {
      success: false,
      error: {
        code: getFirebaseErrorCode(error) ?? "leaderboard/unknown",
        message: getFirebaseErrorMessage(error),
      },
    };
  }
}
