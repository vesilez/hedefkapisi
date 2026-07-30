import "client-only";

import { IDEA_STATUS_LABELS, type IdeaStatus } from "@/constants/idea-statuses";
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
  AdminActivity,
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
  limit,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

type AnalyticsFailure = {
  success: false;
  error: { code: string; message: string };
};

type AdminAnalyticsResult =
  { success: true; data: AdminAnalytics } | AnalyticsFailure;

export type AdminActivitiesResult =
  { success: true; data: AdminActivity[] } | AnalyticsFailure;

const ANALYTICS_IDEA_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const satisfies readonly IdeaStatus[];

function failure(error: unknown): AnalyticsFailure {
  return {
    success: false,
    error: {
      code: getFirebaseErrorCode(error) ?? "firestore/unknown",
      message: getFirebaseErrorMessage(error),
    },
  };
}

async function ensureAdmin(adminId: string): Promise<AnalyticsFailure | null> {
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

function textField(
  data: DocumentData,
  field: string,
  fallback: string,
): string {
  const value: unknown = data[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function fullName(data: DocumentData): string {
  const name = textField(data, "name", "");
  const surname = textField(data, "surname", "");
  return [name, surname].filter(Boolean).join(" ") || "Kullanıcı";
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
  const counts = new Map<UserRole, number>(USER_ROLES.map((role) => [role, 0]));

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

    const [users, ideas, supportRequests] = await Promise.all([
      getDocsFromServer(collection(db, "users")),
      getDocsFromServer(collection(db, "ideas")),
      getDocsFromServer(collection(db, "supportRequests")),
    ]);

    const categoryCounts = new Map<string, number>();
    for (const idea of ideas.docs) {
      const categoryId = textField(idea.data(), "categoryId", "other");
      categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
    }

    return {
      success: true,
      data: {
        userRegistrations: buildDailySeries(users.docs),
        ideaCreations: buildDailySeries(ideas.docs),
        supportRequests: buildDailySeries(supportRequests.docs),
        categoryDistribution: [...categoryCounts.entries()]
          .map(([name, value]) => ({ name, label: name, value }))
          .sort((first, second) => second.value - first.value),
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

export async function getRecentAdminActivities(
  adminId: string,
): Promise<AdminActivitiesResult> {
  try {
    const authorizationFailure = await ensureAdmin(adminId);
    if (authorizationFailure) return authorizationFailure;

    const recentQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        orderBy("createdAt", "desc"),
        limit(10),
      );
    const [ideas, supportRequests, users, comments] = await Promise.all([
      getDocsFromServer(recentQuery("ideas")),
      getDocsFromServer(recentQuery("supportRequests")),
      getDocsFromServer(recentQuery("users")),
      getDocsFromServer(recentQuery("comments")),
    ]);

    const userIds = new Set<string>();
    const ideaIds = new Set<string>();
    for (const idea of ideas.docs) {
      const studentId: unknown = idea.data().studentId;
      if (typeof studentId === "string") userIds.add(studentId);
    }
    for (const supportRequest of supportRequests.docs) {
      const supporterId: unknown = supportRequest.data().supporterId;
      const ideaId: unknown = supportRequest.data().ideaId;
      if (typeof supporterId === "string") userIds.add(supporterId);
      if (typeof ideaId === "string") ideaIds.add(ideaId);
    }
    for (const comment of comments.docs) {
      const userId: unknown = comment.data().userId;
      const ideaId: unknown = comment.data().ideaId;
      if (typeof userId === "string") userIds.add(userId);
      if (typeof ideaId === "string") ideaIds.add(ideaId);
    }

    const [userEntries, ideaEntries] = await Promise.all([
      Promise.all(
        [...userIds].map(async (userId) => {
          const snapshot = await getDoc(doc(db, "users", userId));
          return [
            userId,
            snapshot.exists() ? fullName(snapshot.data()) : "Kullanıcı",
          ] as const;
        }),
      ),
      Promise.all(
        [...ideaIds].map(async (ideaId) => {
          const snapshot = await getDoc(doc(db, "ideas", ideaId));
          return [
            ideaId,
            snapshot.exists()
              ? {
                  title: textField(snapshot.data(), "title", "Başlıksız hayal"),
                  slug: textField(snapshot.data(), "slug", ""),
                  status: textField(snapshot.data(), "status", ""),
                }
              : null,
          ] as const;
        }),
      ),
    ]);
    const userNames = new Map(userEntries);
    const ideaDetails = new Map(ideaEntries);
    const activities: AdminActivity[] = [];

    for (const idea of ideas.docs) {
      const createdAt = documentDate(idea);
      if (!createdAt) continue;
      const studentId: unknown = idea.data().studentId;
      activities.push({
        id: `idea-${idea.id}`,
        type: "idea_created",
        userName:
          typeof studentId === "string"
            ? (userNames.get(studentId) ?? "Kullanıcı")
            : "Kullanıcı",
        relatedTitle: textField(idea.data(), "title", "Başlıksız hayal"),
        createdAt: createdAt.toISOString(),
        href: "/admin/hayaller",
      });
    }

    for (const supportRequest of supportRequests.docs) {
      const createdAt = documentDate(supportRequest);
      if (!createdAt) continue;
      const supporterId: unknown = supportRequest.data().supporterId;
      const ideaId: unknown = supportRequest.data().ideaId;
      const idea =
        typeof ideaId === "string" ? ideaDetails.get(ideaId) : undefined;
      activities.push({
        id: `support-${supportRequest.id}`,
        type: "support_requested",
        userName:
          typeof supporterId === "string"
            ? (userNames.get(supporterId) ?? "Kullanıcı")
            : "Kullanıcı",
        relatedTitle: idea?.title ?? "Hayal bulunamadı",
        createdAt: createdAt.toISOString(),
        href: "/admin/destek-basvurulari",
      });
    }

    for (const user of users.docs) {
      const createdAt = documentDate(user);
      if (!createdAt) continue;
      const rawRole: unknown = user.data().role;
      const role: UserRole = isUserRole(rawRole) ? rawRole : "student";
      activities.push({
        id: `user-${user.id}`,
        type: "user_registered",
        userName: fullName(user.data()),
        relatedTitle: USER_ROLE_LABELS[role],
        createdAt: createdAt.toISOString(),
        href: "/admin/kullanicilar",
      });
    }

    for (const comment of comments.docs) {
      const createdAt = documentDate(comment);
      if (!createdAt) continue;
      const userId: unknown = comment.data().userId;
      const ideaId: unknown = comment.data().ideaId;
      const idea =
        typeof ideaId === "string" ? ideaDetails.get(ideaId) : undefined;
      activities.push({
        id: `comment-${comment.id}`,
        type: "comment_created",
        userName:
          textField(comment.data(), "userName", "") ||
          (typeof userId === "string"
            ? (userNames.get(userId) ?? "Kullanıcı")
            : "Kullanıcı"),
        relatedTitle: idea?.title ?? "Hayal bulunamadı",
        createdAt: createdAt.toISOString(),
        href:
          idea?.status === "approved" && idea.slug
            ? `/hayaller/${idea.slug}`
            : "/admin/hayaller",
      });
    }

    activities.sort((first, second) =>
      second.createdAt.localeCompare(first.createdAt),
    );
    return { success: true, data: activities.slice(0, 10) };
  } catch (error: unknown) {
    console.error("[admin-analytics-service:getRecentAdminActivities]", error);
    return failure(error);
  }
}
