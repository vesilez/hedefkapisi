import "client-only";

import { LEADERBOARD_POINTS } from "@/constants/leaderboard";
import { IDEA_STAGES } from "@/constants/idea-stages";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { USER_ROLES } from "@/constants/roles";
import { grantAchievementInTransaction } from "@/services/achievement-service";
import { applyScoreInTransaction } from "@/services/leaderboard-service";
import {
  createNotification,
  notifyAllAdmins,
} from "@/services/notification-service";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import {
  sponsorProfileInputSchema,
  sponsorSupportInputSchema,
  type SponsorProfileInput,
} from "@/lib/validations/sponsor-schema";
import type {
  SponsorDashboardData,
  SponsorIdeaFilters,
  SponsorProfile,
  SponsorStatus,
  SponsorSupport,
} from "@/types/sponsor";
import type { IdeaListItem } from "@/types/idea";
import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { z } from "zod";

type Result<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

const timestamp = z.unknown().transform((value, context) => {
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = Reflect.get(value, "toDate");
    if (typeof toDate === "function") {
      const date: unknown = Reflect.apply(toDate, value, []);
      if (date instanceof Date) return date.toISOString();
    }
  }
  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const nullableTimestamp = z.union([timestamp, z.null()]);
const sponsorProfileSchema = z.object({
  sponsorId: z.string(),
  institutionName: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string(),
  website: z.string().nullable(),
  city: z.string(),
  supportAreas: z.array(z.string()),
  status: z.enum(["pending", "approved", "rejected"]),
  reviewedBy: z.string().nullable(),
  reviewedAt: nullableTimestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
});
const sponsorSupportSchema = z.object({
  id: z.string(),
  sponsorId: z.string(),
  sponsorName: z.string(),
  ideaId: z.string(),
  ideaOwnerId: z.string(),
  ideaTitle: z.string(),
  ideaSlug: z.string(),
  message: z.string(),
  createdAt: timestamp,
});
const ideaSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  categoryId: z.string(),
  city: z.string().nullable(),
  stage: z.enum(IDEA_STAGES),
  supportNeeds: z.array(z.enum(SUPPORT_TYPES)),
  visibility: z.enum(["public", "anonymous"]),
  isFeatured: z.boolean(),
  supportCount: z.number(),
  likeCount: z.number(),
  commentCount: z.number().default(0),
  coverImageUrl: z.string().nullable(),
  publishedAt: nullableTimestamp,
  createdAt: timestamp,
});

function failure<T>(error: unknown): Result<T> {
  return { success: false, error: { message: getFirebaseErrorMessage(error) } };
}

function parseProfile(id: string, data: DocumentData): SponsorProfile | null {
  const parsed = sponsorProfileSchema.safeParse({ sponsorId: id, ...data });
  return parsed.success ? parsed.data : null;
}

export async function getApprovedSponsors(): Promise<Result<SponsorProfile[]>> {
  try {
    const snapshots = await getDocs(
      query(
        collection(db, "sponsorProfiles"),
        where("status", "==", "approved"),
      ),
    );
    return {
      success: true,
      data: snapshots.docs
        .flatMap((item) => {
          const profile = parseProfile(item.id, item.data());
          return profile ? [profile] : [];
        })
        .sort((a, b) =>
          a.institutionName.localeCompare(b.institutionName, "tr"),
        ),
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getSponsorProfile(
  sponsorId: string,
): Promise<Result<SponsorProfile | null>> {
  try {
    const result = await getApprovedSponsors();
    if (!result.success) return result;
    return {
      success: true,
      data: result.data.find((item) => item.sponsorId === sponsorId) ?? null,
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function saveSponsorApplication(
  input: SponsorProfileInput,
): Promise<Result<void>> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Oturum açmanız gerekiyor.");
    const values = sponsorProfileInputSchema.parse(input);
    const reference = doc(db, "sponsorProfiles", userId);
    await setDoc(
      reference,
      {
        sponsorId: userId,
        ...values,
        organizationName: values.institutionName,
        organizationType: "other",
        status: "pending",
        approvalStatus: "pending",
        reviewedBy: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await notifyAllAdmins({
      sourceId: userId,
      type: "admin_activity",
      title: "Yeni sponsor başvurusu",
      message: `${values.institutionName} onay bekliyor.`,
      targetUrl: "/admin/sponsorlar",
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

async function getSponsorIdeas(
  filters: SponsorIdeaFilters,
): Promise<IdeaListItem[]> {
  const snapshots = await getDocs(
    query(
      collection(db, "ideas"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
    ),
  );
  const search = filters.search?.trim().toLocaleLowerCase("tr") ?? "";
  return snapshots.docs.flatMap((item) => {
    const parsed = ideaSchema.safeParse({ id: item.id, ...item.data() });
    if (!parsed.success) return [];
    const idea = parsed.data;
    if (
      search &&
      !`${idea.title} ${idea.shortDescription}`
        .toLocaleLowerCase("tr")
        .includes(search)
    )
      return [];
    if (filters.category && idea.categoryId !== filters.category) return [];
    if (filters.city && idea.city !== filters.city) return [];
    if (
      filters.supportArea &&
      !idea.supportNeeds.includes(filters.supportArea as never)
    )
      return [];
    return [idea];
  });
}

async function getSupports(sponsorId: string): Promise<SponsorSupport[]> {
  const snapshots = await getDocs(
    query(
      collection(db, "sponsorSupports"),
      where("sponsorId", "==", sponsorId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snapshots.docs.flatMap((item) => {
    const parsed = sponsorSupportSchema.safeParse({
      id: item.id,
      ...item.data(),
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function getSponsorDashboard(
  filters: SponsorIdeaFilters = {},
): Promise<Result<SponsorDashboardData>> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Oturum açmanız gerekiyor.");
    const ownSnapshots = await getDocs(
      query(
        collection(db, "sponsorProfiles"),
        where("sponsorId", "==", userId),
      ),
    );
    const profileSnapshot = ownSnapshots.docs[0];
    const profile = profileSnapshot
      ? parseProfile(profileSnapshot.id, profileSnapshot.data())
      : null;
    const [ideas, supports] = await Promise.all([
      profile?.status === "approved"
        ? getSponsorIdeas(filters)
        : Promise.resolve([]),
      profile ? getSupports(userId) : Promise.resolve([]),
    ]);
    return { success: true, data: { profile, ideas, supports } };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function createOfficialSponsorSupport(input: {
  ideaId: string;
  message: string;
}): Promise<Result<void>> {
  try {
    const sponsorId = auth.currentUser?.uid;
    if (!sponsorId) throw new Error("Oturum açmanız gerekiyor.");
    const values = sponsorSupportInputSchema.parse(input);
    let ownerId = "";
    let title = "";
    let institutionName = "";
    let ideaSlug = "";
    const supportId = `${sponsorId}__${values.ideaId}`;
    await runTransaction(db, async (transaction) => {
      const profileRef = doc(db, "sponsorProfiles", sponsorId);
      const ideaRef = doc(db, "ideas", values.ideaId);
      const userRef = doc(db, "users", sponsorId);
      const supportRef = doc(db, "sponsorSupports", supportId);
      const [profileSnap, ideaSnap, userSnap, existing] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(ideaRef),
        transaction.get(userRef),
        transaction.get(supportRef),
      ]);
      if (!profileSnap.exists() || profileSnap.data().status !== "approved")
        throw new Error("Sponsor hesabınız henüz onaylanmamış.");
      if (!ideaSnap.exists() || ideaSnap.data().status !== "approved")
        throw new Error("Hayal bulunamadı.");
      if (existing.exists())
        throw new Error("Bu hayale zaten resmi destek verdiniz.");
      ownerId = String(ideaSnap.data().studentId);
      title = String(ideaSnap.data().title);
      ideaSlug = String(ideaSnap.data().slug);
      institutionName = String(profileSnap.data().institutionName);
      transaction.set(supportRef, {
        id: supportId,
        sponsorId,
        sponsorName: institutionName,
        ideaId: values.ideaId,
        ideaOwnerId: ownerId,
        ideaTitle: title,
        ideaSlug,
        message: values.message,
        createdAt: serverTimestamp(),
      });
      transaction.update(ideaRef, {
        supportCount: increment(1),
        lastSponsorSupportId: supportId,
      });
      applyScoreInTransaction(
        transaction,
        userSnap,
        "sponsor_support",
        supportId,
        LEADERBOARD_POINTS.sponsorSupport,
      );
    });
    await createNotification({
      userId: ownerId,
      sourceId: supportId,
      type: "sponsor_support_received",
      title: "Resmî sponsor desteği aldınız",
      message: `${institutionName}, “${title}” hayalinize resmî destek verdi.`,
      targetUrl: `/hayaller/${ideaSlug}`,
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getPendingSponsorApplications(): Promise<
  Result<SponsorProfile[]>
> {
  try {
    const snapshots = await getDocs(
      query(collection(db, "sponsorProfiles"), orderBy("createdAt", "desc")),
    );
    return {
      success: true,
      data: snapshots.docs.flatMap((item) => {
        const value = parseProfile(item.id, item.data());
        return value ? [value] : [];
      }),
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function reviewSponsorApplication(
  sponsorId: string,
  status: Exclude<SponsorStatus, "pending">,
): Promise<Result<void>> {
  try {
    const adminId = auth.currentUser?.uid;
    if (!adminId) throw new Error("Oturum açmanız gerekiyor.");
    await runTransaction(db, async (transaction) => {
      const profileRef = doc(db, "sponsorProfiles", sponsorId);
      const userRef = doc(db, "users", sponsorId);
      const userSnap = await transaction.get(userRef);
      transaction.update(profileRef, {
        status,
        approvalStatus: status,
        reviewedBy: adminId,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (status === "approved" && userSnap.exists()) {
        const granted = grantAchievementInTransaction(
          transaction,
          sponsorId,
          userSnap.data(),
          "sponsor_badge",
        );
        if (granted)
          transaction.set(
            doc(db, "leaderboard", sponsorId),
            { achievementCount: increment(1), updatedAt: serverTimestamp() },
            { merge: true },
          );
      }
    });
    await createNotification({
      userId: sponsorId,
      sourceId: sponsorId,
      type: "sponsor_approved",
      title:
        status === "approved"
          ? "Sponsor başvurunuz onaylandı"
          : "Sponsor başvurunuz sonuçlandı",
      message:
        status === "approved"
          ? "Sponsor paneliniz ve resmî destek özellikleri kullanıma açıldı."
          : "Başvurunuz reddedildi; bilgilerinizi güncelleyerek yeniden gönderebilirsiniz.",
      targetUrl: "/sponsor-paneli",
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export const sponsorRoleSchema = z.enum(USER_ROLES);
