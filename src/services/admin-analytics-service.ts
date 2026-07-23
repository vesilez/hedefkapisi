import "client-only";

import {
  IDEA_STATUS_LABELS,
  type IdeaStatus,
} from "@/constants/idea-statuses";
import {
  isAdminRole,
  isUserRole,
  USER_ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import type {
  AdminAnalytics,
  DailyAnalyticsPoint,
  DistributionPoint,
  PopularIdeaPoint,
} from "@/types/admin-analytics";
import {
  collection,
  doc,
  getDoc,
  getDocsFromServer,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

type AdminAnalyticsResult =
  | { success: true; data: AdminAnalytics }
  | { success: false; error: { code: string; message: string } };

const ANALYTICS_IDEA_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const satisfies readonly IdeaStatus[];

function failure(error: unknown): AdminAnalyticsResult {
  return {
    success: false,
    error: {
      code: getFirebaseErrorCode(error) ?? "firestore/unknown",
      message: getFirebaseErrorMessage(error),
    },
  };
}

async function ensureAdmin(adminId: string): Promise<AdminAnalyticsResult | null> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return {
      success: false,
      error: {
        code: "analytics/unauthorized",
        message: "Bu işlem için yetkiniz yok.",
      },
    };
  }

  const profile = await getDoc(doc(db, "users", adminId));
  const role: unknown = profile.exists() ? profile.data().role : null;
  if (!isAdminRole(role)) {
    return {
      success: false,
      error: {
        code: "analytics/unauthorized",
        message: "Bu işlem için yetkiniz yok.",
      },
    };
  }

  return null;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastThirtyDays(): DailyAnalyticsPoint[] {
  const formatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    return { date: dateKey(date), label: formatter.format(date), count: 0 };
  });
}

function documentDate(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Date | null {
  const value: unknown = snapshot.data().createdAt;
  if (
    typeof value !== "object" ||
    value === null ||
    !("toDate" in value) ||
    typeof value.toDate !== "function"
  ) {
    return null;
  }

  const date = value.toDate();
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

function buildDailySeries(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): DailyAnalyticsPoint[] {
  const points = lastThirtyDays();
  const byDate = new Map(points.map((point) => [point.date, point]));

  for (const snapshot of snapshots) {
    const createdAt = documentDate(snapshot);
    if (!createdAt) continue;
    const point = byDate.get(dateKey(createdAt));
    if (point) point.count += 1;
  }

  return points;
}

function buildRoleDistribution(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): DistributionPoint<UserRole>[] {
  const counts = new Map<UserRole, number>(
    USER_ROLES.map((role) => [role, 0]),
  );

  for (const snapshot of snapshots) {
    const role: unknown = snapshot.data().role;
    if (isUserRole(role)) counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return USER_ROLES.map((role) => ({
    name: role,
    label: USER_ROLE_LABELS[role],
    value: counts.get(role) ?? 0,
  }));
}

function buildIdeaStatusDistribution(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): AdminAnalytics["ideaStatusDistribution"] {
  const counts = new Map<(typeof ANALYTICS_IDEA_STATUSES)[number], number>(
    ANALYTICS_IDEA_STATUSES.map((status) => [status, 0]),
  );

  for (const snapshot of snapshots) {
    const status: unknown = snapshot.data().status;
    if (
      status === "pending" ||
      status === "approved" ||
      status === "rejected"
    ) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  return ANALYTICS_IDEA_STATUSES.map((status) => ({
    name: status,
    label: IDEA_STATUS_LABELS[status],
    value: counts.get(status) ?? 0,
  }));
}

function buildMostLikedIdeas(
  snapshots: readonly QueryDocumentSnapshot<DocumentData>[],
): PopularIdeaPoint[] {
  return snapshots
    .map((snapshot) => {
      const title: unknown = snapshot.data().title;
      const likeCount: unknown = snapshot.data().likeCount;
      return {
        id: snapshot.id,
        title:
          typeof title === "string" && title.trim()
            ? title.trim()
            : "Başlıksız hayal",
        likeCount:
          typeof likeCount === "number" &&
          Number.isInteger(likeCount) &&
          likeCount >= 0
            ? likeCount
            : 0,
      };
    })
    .sort(
      (first, second) =>
        second.likeCount - first.likeCount ||
        first.title.localeCompare(second.title, "tr-TR"),
    )
    .slice(0, 5);
}

export async function getAdminAnalytics(
  adminId: string,
): Promise<AdminAnalyticsResult> {
  try {
    const authorizationFailure = await ensureAdmin(adminId);
    if (authorizationFailure) return authorizationFailure;

    const [users, ideas] = await Promise.all([
      getDocsFromServer(collection(db, "users")),
      getDocsFromServer(collection(db, "ideas")),
    ]);

    return {
      success: true,
      data: {
        userRegistrations: buildDailySeries(users.docs),
        ideaCreations: buildDailySeries(ideas.docs),
        ideaStatusDistribution: buildIdeaStatusDistribution(ideas.docs),
        userRoleDistribution: buildRoleDistribution(users.docs),
        mostLikedIdeas: buildMostLikedIdeas(ideas.docs),
      },
    };
  } catch (error: unknown) {
    console.error("[admin-analytics-service:getAdminAnalytics]", error);
    return failure(error);
  }
}
