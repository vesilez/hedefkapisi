import "client-only";

import { LEADERBOARD_POINTS } from "@/constants/leaderboard";
import { IDEA_STAGES } from "@/constants/idea-stages";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { isAdminRole, USER_ROLES } from "@/constants/roles";
import { applyScoreInTransaction } from "@/services/leaderboard-service";
import {
  createNotification,
  notifyAllAdmins,
} from "@/services/notification-service";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import {
  sponsorProfileInputSchema,
  sponsorSupportInputSchema,
  type SponsorProfileInput,
} from "@/lib/validations/sponsor-schema";
import type {
  SponsorDashboardData,
  AdminSponsorApplication,
  SponsorIdeaFilters,
  SponsorOfferListItem,
  SponsorProfile,
  SponsorStatus,
  SponsorSupport,
} from "@/types/sponsor";
import type { IdeaListItem } from "@/types/idea";
import { getSupportRequestsByUser } from "@/services/support-request-service";
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
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
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
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
  console.error("[sponsor-service] Firebase operation failed", {
    code: getFirebaseErrorCode(error) ?? "firebase/unknown",
    message:
      error instanceof Error ? error.message : getFirebaseErrorMessage(error),
    error,
  });
  return { success: false, error: { message: getFirebaseErrorMessage(error) } };
}

function parseProfile(id: string, data: DocumentData): SponsorProfile | null {
  const legacyApproval =
    data.approvalStatus ??
    (data.isApproved === true
      ? "approved"
      : data.isApproved === false
        ? "pending"
        : data.status);
  const parsed = sponsorProfileSchema.safeParse({
    sponsorId: id,
    ...data,
    approvalStatus: legacyApproval,
  });
  return parsed.success ? parsed.data : null;
}

export async function getApprovedSponsors(): Promise<Result<SponsorProfile[]>> {
  try {
    const snapshots = await getDocs(
      query(
        collection(db, "sponsorProfiles"),
        where("approvalStatus", "==", "approved"),
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
      link: "/admin/sponsorlar",
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

async function getSponsorshipOffers(
  sponsorId: string,
): Promise<SponsorOfferListItem[]> {
  const result = await getSupportRequestsByUser(sponsorId);
  if (!result.success) {
    throw {
      code: result.error.code,
      message: result.error.firebaseMessage ?? result.error.message,
    };
  }
  const requests = result.data.filter(
    (request) => request.applicationType === "sponsorship",
  );
  return Promise.all(
    requests.map(async (request) => {
      const idea = await getDoc(doc(db, "ideas", request.ideaId));
      const title: unknown = idea.data()?.title;
      const slug: unknown = idea.data()?.slug;
      return {
        request,
        ideaTitle:
          typeof title === "string" && title.trim()
            ? title.trim()
            : "Hayal bulunamadı",
        ideaSlug: typeof slug === "string" && slug ? slug : null,
      };
    }),
  );
}

type DashboardQueryDetails = {
  collection: string;
  fields: readonly string[];
};

function logDashboardQueryError(
  operation: string,
  details: DashboardQueryDetails,
  error: unknown,
): void {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : getFirebaseErrorMessage(error);

  console.error(`[sponsor-dashboard:${operation}] Firestore query failed`, {
    code: getFirebaseErrorCode(error) ?? "firestore/unknown",
    message,
    collection: details.collection,
    fields: details.fields,
    error,
  });
}

async function loadSponsorIdeas(
  filters: SponsorIdeaFilters,
): Promise<IdeaListItem[]> {
  const details = {
    collection: "ideas",
    fields: ["status == approved", "createdAt desc"],
  } as const;
  try {
    console.info("[sponsor-dashboard:getSponsorIdeas] Firestore query", details);
    const ideas = await getSponsorIdeas(filters);
    console.info("[sponsor-dashboard:getSponsorIdeas] Firestore query succeeded", {
      ...details,
      count: ideas.length,
    });
    return ideas;
  } catch (error: unknown) {
    logDashboardQueryError("getSponsorIdeas", details, error);
    return [];
  }
}

async function loadSupports(sponsorId: string): Promise<SponsorSupport[]> {
  const details = {
    collection: "sponsorSupports",
    fields: ["sponsorId == currentUser.uid", "createdAt desc"],
  } as const;
  try {
    console.info("[sponsor-dashboard:getSupports] Firestore query", details);
    const supports = await getSupports(sponsorId);
    console.info("[sponsor-dashboard:getSupports] Firestore query succeeded", {
      ...details,
      count: supports.length,
    });
    return supports;
  } catch (error: unknown) {
    logDashboardQueryError("getSupports", details, error);
    return [];
  }
}

async function loadSponsorshipOffers(
  sponsorId: string,
): Promise<SponsorOfferListItem[]> {
  const details = {
    collection: "supportRequests (+ ideas document reads)",
    fields: ["supporterId == currentUser.uid"],
  } as const;
  try {
    console.info(
      "[sponsor-dashboard:getSponsorshipOffers] Firestore query",
      details,
    );
    const offers = await getSponsorshipOffers(sponsorId);
    console.info(
      "[sponsor-dashboard:getSponsorshipOffers] Firestore query succeeded",
      { ...details, count: offers.length },
    );
    return offers;
  } catch (error: unknown) {
    logDashboardQueryError("getSponsorshipOffers", details, error);
    return [];
  }
}

export async function getSponsorDashboard(
  filters: SponsorIdeaFilters = {},
): Promise<Result<SponsorDashboardData>> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Oturum açmanız gerekiyor.");
    // Rules authorize an owner by the document id. A collection query filtered
    // by sponsorId cannot prove that every possible result has that id, so it is
    // rejected with permission-denied even for the owner. Read the canonical
    // sponsorProfiles/{uid} document directly instead.
    const profileSnapshot = await getDoc(doc(db, "sponsorProfiles", userId));
    const profile = profileSnapshot.exists()
      ? parseProfile(profileSnapshot.id, profileSnapshot.data())
      : null;
    const [ideas, supports, offers] = await Promise.all([
      profile?.approvalStatus === "approved"
        ? loadSponsorIdeas(filters)
        : Promise.resolve([]),
      profile ? loadSupports(userId) : Promise.resolve([]),
      loadSponsorshipOffers(userId),
    ]);
    return {
      success: true,
      data: {
        profile,
        ideas,
        supports,
        offers,
        statistics: {
          totalOffers: offers.length,
          pendingOffers: offers.filter(
            (offer) => offer.request.status === "pending",
          ).length,
          approvedOffers: offers.filter(
            (offer) => offer.request.status === "approved",
          ).length,
          totalSupports:
            supports.length +
            offers.filter((offer) => offer.request.status === "approved")
              .length,
        },
      },
    };
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
      if (
        !profileSnap.exists() ||
        profileSnap.data().approvalStatus !== "approved"
      )
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
      link: `/hayaller/${ideaSlug}`,
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getPendingSponsorApplications(): Promise<
  Result<AdminSponsorApplication[]>
> {
  try {
    const adminId = auth.currentUser?.uid;
    if (!adminId) throw new Error("Oturum açmanız gerekiyor.");
    const adminSnapshot = await getDoc(doc(db, "users", adminId));
    if (!adminSnapshot.exists() || !isAdminRole(adminSnapshot.data().role)) {
      throw new Error("Bu işlemi gerçekleştirmek için yetkiniz yok.");
    }
    const snapshots = await getDocs(
      query(collection(db, "sponsorProfiles"), orderBy("createdAt", "desc")),
    );
    const profiles = snapshots.docs.flatMap((item) => {
      const value = parseProfile(item.id, item.data());
      return value ? [value] : [];
    });

    const applications = await Promise.all(
      profiles.map(async (profile) => {
        const userSnapshot = await getDoc(doc(db, "users", profile.sponsorId));
        const email: unknown = userSnapshot.data()?.email;
        return {
          ...profile,
          email: typeof email === "string" ? email : "E-posta bulunamadı",
        };
      }),
    );

    const migration = writeBatch(db);
    let migrationCount = 0;
    for (const item of snapshots.docs) {
      const data = item.data();
      if (data.status !== undefined || data.isApproved !== undefined || data.approvalStatus === undefined) {
        const profile = parseProfile(item.id, data);
        if (profile) {
          migration.set(item.ref, {
            approvalStatus: profile.approvalStatus,
            status: deleteField(),
            isApproved: deleteField(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          migrationCount += 1;
        }
      }
    }
    if (migrationCount > 0) {
      try {
        await migration.commit();
      } catch (migrationError: unknown) {
        console.error("[sponsor-service] Legacy sponsor migration failed", {
          code: getFirebaseErrorCode(migrationError) ?? "firebase/unknown",
          message:
            migrationError instanceof Error
              ? migrationError.message
              : getFirebaseErrorMessage(migrationError),
          error: migrationError,
        });
      }
    }
    return { success: true, data: applications };
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
    const adminSnapshot = await getDoc(doc(db, "users", adminId));
    if (!adminSnapshot.exists() || !isAdminRole(adminSnapshot.data().role)) {
      throw new Error("Bu işlemi gerçekleştirmek için yetkiniz yok.");
    }
    await runTransaction(db, async (transaction) => {
      const profileRef = doc(db, "sponsorProfiles", sponsorId);
      const profileSnapshot = await transaction.get(profileRef);
      if (!profileSnapshot.exists()) {
        throw new Error("Sponsor başvurusu bulunamadı.");
      }
      transaction.update(profileRef, {
        approvalStatus: status,
        reviewedBy: adminId,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
      link: "/sponsor/dashboard",
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export const sponsorRoleSchema = z.enum(USER_ROLES);
