import "client-only";

import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { isAdminRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import type { DailyAnalyticsPoint } from "@/types/admin-analytics";
import type {
  ActiveEntityMetric,
  AdminAnalyticsReport,
  AnalyticsDateRange,
  CategorySupportMetric,
  RankedIdeaMetric,
} from "@/types/analytics";
import {
  collection,
  doc,
  getDoc,
  getDocsFromServer,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

interface AnalyticsDocuments {
  users: QueryDocumentSnapshot<DocumentData>[];
  ideas: QueryDocumentSnapshot<DocumentData>[];
  supportRequests: QueryDocumentSnapshot<DocumentData>[];
  mentorships: QueryDocumentSnapshot<DocumentData>[];
  mentorNotes: QueryDocumentSnapshot<DocumentData>[];
  mentorEvaluations: QueryDocumentSnapshot<DocumentData>[];
  sponsorSupports: QueryDocumentSnapshot<DocumentData>[];
  sponsorProfiles: QueryDocumentSnapshot<DocumentData>[];
  dailyActiveUsers: QueryDocumentSnapshot<DocumentData>[];
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultAnalyticsDateRange(): AnalyticsDateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 29);
  return { from: localDateKey(from), to: localDateKey(to) };
}

function parseDateKey(value: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validRange(range: AnalyticsDateRange): {
  from: Date;
  to: Date;
} | null {
  const from = parseDateKey(range.from);
  const to = parseDateKey(range.to, true);
  if (!from || !to || from > to) return null;
  const maximum = new Date(from);
  maximum.setFullYear(maximum.getFullYear() + 1);
  return to <= maximum ? { from, to } : null;
}

function timestampDate(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  field = "createdAt",
): Date | null {
  const value: unknown = snapshot.data()[field];
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

function inRange(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  range: { from: Date; to: Date },
): boolean {
  const date = timestampDate(snapshot);
  return Boolean(date && date >= range.from && date <= range.to);
}

function text(data: DocumentData, field: string, fallback: string): string {
  const value: unknown = data[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nonnegativeNumber(data: DocumentData, field: string): number {
  const value: unknown = data[field];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function fullName(data: DocumentData): string {
  return `${text(data, "name", "")} ${text(data, "surname", "")}`.trim() ||
    "Kullanıcı";
}

function lastThirtyDaysSeries(
  snapshots: QueryDocumentSnapshot<DocumentData>[],
): DailyAnalyticsPoint[] {
  const formatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    return {
      date: localDateKey(date),
      label: formatter.format(date),
      count: 0,
    };
  });
  const lookup = new Map(points.map((point) => [point.date, point]));
  for (const snapshot of snapshots) {
    const createdAt = timestampDate(snapshot);
    if (!createdAt) continue;
    const point = lookup.get(localDateKey(createdAt));
    if (point) point.count += 1;
  }
  return points;
}

function rankedIdeas(
  ideas: QueryDocumentSnapshot<DocumentData>[],
  field: "viewCount" | "likeCount",
): RankedIdeaMetric[] {
  return ideas
    .map((idea) => ({
      id: idea.id,
      title: text(idea.data(), "title", "Başlıksız hayal"),
      slug: text(idea.data(), "slug", ""),
      value: nonnegativeNumber(idea.data(), field),
    }))
    .sort(
      (first, second) =>
        second.value - first.value ||
        first.title.localeCompare(second.title, "tr-TR"),
    )
    .slice(0, 10);
}

function activeEntities(
  counts: Map<string, number>,
  names: Map<string, string>,
): ActiveEntityMetric[] {
  return [...counts.entries()]
    .map(([id, activityCount]) => ({
      id,
      name: names.get(id) ?? "Kullanıcı",
      activityCount,
    }))
    .sort(
      (first, second) =>
        second.activityCount - first.activityCount ||
        first.name.localeCompare(second.name, "tr-TR"),
    )
    .slice(0, 10);
}

function incrementEntity(
  counts: Map<string, number>,
  snapshot: QueryDocumentSnapshot<DocumentData>,
  field: string,
) {
  const value: unknown = snapshot.data()[field];
  if (typeof value === "string" && value) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
}

function categoryMetrics(
  ideas: QueryDocumentSnapshot<DocumentData>[],
  supportRequests: QueryDocumentSnapshot<DocumentData>[],
  sponsorSupports: QueryDocumentSnapshot<DocumentData>[],
): CategorySupportMetric[] {
  const ideaCategories = new Map(
    ideas.map((idea) => [idea.id, text(idea.data(), "categoryId", "other")]),
  );
  const counts = new Map<string, number>();
  const countIdea = (ideaId: unknown) => {
    if (typeof ideaId !== "string") return;
    const category = ideaCategories.get(ideaId);
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  };
  for (const request of supportRequests) {
    if (request.data().status === "approved") {
      countIdea(request.data().ideaId);
    }
  }
  for (const support of sponsorSupports) countIdea(support.data().ideaId);
  const labels = new Map(
    DEFAULT_CATEGORIES.map((category) => [category.id, category.label]),
  );
  return [...counts.entries()]
    .map(([id, supportCount]) => ({
      id,
      label: labels.get(id as (typeof DEFAULT_CATEGORIES)[number]["id"]) ?? id,
      supportCount,
    }))
    .sort((first, second) => second.supportCount - first.supportCount)
    .slice(0, 10);
}

async function ensureAdmin(adminId: string): Promise<boolean> {
  if (!adminId || auth.currentUser?.uid !== adminId) return false;
  const snapshot = await getDoc(doc(db, "users", adminId));
  return snapshot.exists() && isAdminRole(snapshot.data().role);
}

async function loadDocuments(): Promise<AnalyticsDocuments> {
  const names = [
    "users",
    "ideas",
    "supportRequests",
    "mentorships",
    "mentorNotes",
    "mentorEvaluations",
    "sponsorSupports",
    "sponsorProfiles",
    "dailyActiveUsers",
  ] as const;
  const snapshots = await Promise.all(
    names.map((name) => getDocsFromServer(collection(db, name))),
  );
  return {
    users: snapshots[0].docs,
    ideas: snapshots[1].docs,
    supportRequests: snapshots[2].docs,
    mentorships: snapshots[3].docs,
    mentorNotes: snapshots[4].docs,
    mentorEvaluations: snapshots[5].docs,
    sponsorSupports: snapshots[6].docs,
    sponsorProfiles: snapshots[7].docs,
    dailyActiveUsers: snapshots[8].docs,
  };
}

export async function getAnalyticsReport(
  adminId: string,
  requestedRange: AnalyticsDateRange,
): Promise<Result<AdminAnalyticsReport>> {
  try {
    if (!(await ensureAdmin(adminId))) {
      return { success: false, error: { message: "Bu işlem için yetkiniz yok." } };
    }
    const range = validRange(requestedRange);
    if (!range) {
      return {
        success: false,
        error: { message: "En fazla bir yıllık geçerli bir tarih aralığı seçin." },
      };
    }
    const documents = await loadDocuments();
    const filteredIdeas = documents.ideas.filter((item) => inRange(item, range));
    const filteredMentorships = documents.mentorships.filter((item) =>
      inRange(item, range),
    );
    const filteredNotes = documents.mentorNotes.filter((item) =>
      inRange(item, range),
    );
    const filteredEvaluations = documents.mentorEvaluations.filter((item) =>
      inRange(item, range),
    );
    const filteredSponsorSupports = documents.sponsorSupports.filter((item) =>
      inRange(item, range),
    );
    const filteredSupportRequests = documents.supportRequests.filter((item) =>
      inRange(item, range),
    );
    const names = new Map(
      documents.users.map((user) => [user.id, fullName(user.data())]),
    );
    const mentorCounts = new Map<string, number>();
    for (const item of [
      ...filteredMentorships,
      ...filteredNotes,
      ...filteredEvaluations,
    ]) {
      incrementEntity(mentorCounts, item, "mentorId");
    }
    const sponsorCounts = new Map<string, number>();
    for (const item of filteredSponsorSupports) {
      incrementEntity(sponsorCounts, item, "sponsorId");
    }
    const sponsorNames = new Map(
      documents.sponsorProfiles.map((profile) => [
        profile.id,
        text(profile.data(), "institutionName", names.get(profile.id) ?? "Sponsor"),
      ]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffs = [0, 6, 29].map((days) => {
      const value = new Date(today);
      value.setDate(today.getDate() - days);
      return localDateKey(value);
    });
    const activeCounts = cutoffs.map((cutoff) => {
      const users = new Set<string>();
      for (const activity of documents.dailyActiveUsers) {
        const date: unknown = activity.data().date;
        const userId: unknown = activity.data().userId;
        if (
          typeof date === "string" &&
          date >= cutoff &&
          typeof userId === "string"
        ) {
          users.add(userId);
        }
      }
      return users.size;
    });

    return {
      success: true,
      data: {
        range: requestedRange,
        generatedAt: new Date().toISOString(),
        metrics: {
          dailyActiveUsers: activeCounts[0] ?? 0,
          weeklyActiveUsers: activeCounts[1] ?? 0,
          monthlyActiveUsers: activeCounts[2] ?? 0,
          totalUsers: documents.users.length,
          dailyNewUsers: documents.users.filter((user) => {
            const createdAt = timestampDate(user);
            return Boolean(createdAt && createdAt >= today);
          }).length,
        },
        userGrowth: lastThirtyDaysSeries(documents.users),
        ideaGrowth: lastThirtyDaysSeries(documents.ideas),
        supportGrowth: lastThirtyDaysSeries(documents.supportRequests),
        mostViewedIdeas: rankedIdeas(filteredIdeas, "viewCount"),
        mostLikedIdeas: rankedIdeas(filteredIdeas, "likeCount"),
        mostActiveMentors: activeEntities(mentorCounts, names),
        mostActiveSponsors: activeEntities(sponsorCounts, sponsorNames),
        mostSupportedCategories: categoryMetrics(
          documents.ideas,
          filteredSupportRequests,
          filteredSponsorSupports,
        ),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: { message: getFirebaseErrorMessage(error) } };
  }
}

function csvCell(value: string | number): string {
  const rawValue = String(value);
  const formulaSafeValue = /^[=+\-@]/u.test(rawValue)
    ? `'${rawValue}`
    : rawValue;
  const normalized = formulaSafeValue.replace(/"/g, '""');
  return `"${normalized}"`;
}

export function buildAnalyticsCsv(report: AdminAnalyticsReport): string {
  const rows: Array<Array<string | number>> = [
    ["Hedef Kapısı Analytics", `${report.range.from} - ${report.range.to}`],
    ["Oluşturulma", report.generatedAt],
    [],
    ["Metrik", "Değer"],
    ["Günlük aktif kullanıcı", report.metrics.dailyActiveUsers],
    ["Haftalık aktif kullanıcı", report.metrics.weeklyActiveUsers],
    ["Aylık aktif kullanıcı", report.metrics.monthlyActiveUsers],
    ["Toplam kullanıcı", report.metrics.totalUsers],
    ["Günlük yeni kayıt", report.metrics.dailyNewUsers],
    [],
    ["En çok görüntülenen hayaller", "Görüntülenme"],
    ...report.mostViewedIdeas.map((item) => [item.title, item.value]),
    [],
    ["En çok beğenilen hayaller", "Beğeni"],
    ...report.mostLikedIdeas.map((item) => [item.title, item.value]),
    [],
    ["En aktif mentorlar", "Aktivite"],
    ...report.mostActiveMentors.map((item) => [item.name, item.activityCount]),
    [],
    ["En aktif sponsorlar", "Destek"],
    ...report.mostActiveSponsors.map((item) => [item.name, item.activityCount]),
    [],
    ["En çok destek verilen kategoriler", "Destek"],
    ...report.mostSupportedCategories.map((item) => [
      item.label,
      item.supportCount,
    ]),
    [],
    ["Tarih", "Yeni kullanıcı", "Yeni hayal", "Destek başvurusu"],
    ...report.userGrowth.map((point, index) => [
      point.date,
      point.count,
      report.ideaGrowth[index]?.count ?? 0,
      report.supportGrowth[index]?.count ?? 0,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}
