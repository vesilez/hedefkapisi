import "client-only";

import { isAdminRole } from "@/constants/roles";
import { SUPPORT_REQUEST_STATUSES } from "@/constants/support-request-statuses";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import { createSupportRequestSchema } from "@/lib/validations/support-request-schema";
import {
  createNotification,
  notifyAllAdmins,
} from "@/services/notification-service";
import { grantAchievementInTransaction } from "@/services/achievement-service";
import { LEADERBOARD_POINTS } from "@/constants/leaderboard";
import { applyScoreInTransaction } from "@/services/leaderboard-service";
import type {
  CreateSupportRequestInput,
  SupportApplicationType,
  SupportRequest,
} from "@/types/support-request";
import {
  CONTACT_PREFERENCES,
  SUPPORT_APPLICATION_TYPES,
} from "@/types/support-request";
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getCountFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { z } from "zod";

export type SupportRequestServiceResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { message: string; code?: string; firebaseMessage?: string };
    };

export interface AdminSupportRequestListItem {
  request: SupportRequest;
  applicantName: string;
  applicantEmail: string;
  applicantRole: UserRole;
  ideaTitle: string;
}

export interface AdminSupportRequestStatistics {
  total: number;
  pending: number;
  addedLastThirtyDays: number;
}

const timestampSchema = z.unknown().transform((value, context) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const requestSchema = z.object({
  id: z.string().min(1),
  ideaId: z.string().min(1),
  supporterId: z.string().min(1),
  sponsorId: z.string().nullable().default(null),
  supportTypes: z.array(z.enum(SUPPORT_TYPES)),
  applicationType: z.enum(SUPPORT_APPLICATION_TYPES).default("support"),
  applicantRole: z
    .enum(["supporter", "mentor", "sponsor"])
    .default("supporter"),
  message: z.string(),
  contactPreference: z.enum(CONTACT_PREFERENCES).default("platform"),
  contributionDetails: z.string().nullable().default(null),
  sponsorshipOffer: z
    .object({
      estimatedBudget: z.string(),
      resources: z.string(),
      duration: z.string(),
    })
    .nullable()
    .default(null),
  status: z.enum(SUPPORT_REQUEST_STATUSES),
  adminNote: z.string().nullable(),
  reviewedBy: z.string().nullable().default(null),
  reviewedAt: z.union([timestampSchema, z.null()]).default(null),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

function failure<T>(error: unknown): SupportRequestServiceResult<T> {
  const code = getFirebaseErrorCode(error);
  const firebaseMessage =
    error instanceof Error ? error.message : getFirebaseErrorMessage(error);
  console.error("[support-request-service] Firestore operation failed", {
    userId: auth.currentUser?.uid ?? null,
    code: code ?? "firestore/unknown",
    message: firebaseMessage,
    error,
  });
  return {
    success: false,
    error: {
      message: getFirebaseErrorMessage(error),
      code,
      firebaseMessage,
    },
  };
}

function messageFailure<T>(message: string): SupportRequestServiceResult<T> {
  return { success: false, error: { message } };
}

function logNotificationError(context: string, message: string): void {
  console.error(
    `[support-request-service:${context}] notification failed:`,
    message,
  );
}

function applicationTypeForRole(role: unknown): SupportApplicationType | null {
  if (role === "supporter") return "support";
  if (role === "mentor") return "mentorship";
  if (role === "sponsor") return "sponsorship";
  return null;
}

function parseRequests(
  snapshots: Awaited<ReturnType<typeof getDocs>>,
): SupportRequestServiceResult<SupportRequest[]> {
  const requests: SupportRequest[] = [];
  for (const snapshot of snapshots.docs) {
    const data: unknown = snapshot.data();
    const parsed = requestSchema.safeParse({
      ...(typeof data === "object" && data !== null ? data : {}),
      id: snapshot.id,
    });
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[support-requests] invalid document:",
          snapshot.id,
          parsed.error.issues,
        );
      }
      return messageFailure("Destek başvuruları şu anda okunamıyor.");
    }
    requests.push(parsed.data);
  }
  requests.sort((first, second) =>
    second.createdAt.localeCompare(first.createdAt),
  );
  return { success: true, data: requests };
}

async function ensureAdmin(
  adminId: string,
): Promise<SupportRequestServiceResult<void>> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return messageFailure("Bu işlem için yetkiniz yok.");
  }
  try {
    const profile = await getDoc(doc(db, "users", adminId));
    const rawRole: unknown = profile.exists() ? profile.data().role : null;
    const role =
      typeof rawRole === "string" ? rawRole.trim().toLowerCase() : rawRole;
    return isAdminRole(role)
      ? { success: true, data: undefined }
      : messageFailure("Bu işlem için yetkiniz yok.");
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function createSupportRequest(
  input: CreateSupportRequestInput,
): Promise<SupportRequestServiceResult<{ id: string }>> {
  const validation = createSupportRequestSchema.safeParse(input);
  if (!validation.success) {
    return messageFailure(
      validation.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.",
    );
  }

  const supporterId = auth.currentUser?.uid;
  if (!supporterId)
    return messageFailure("Başvuru yapmak için giriş yapmalısınız.");

  try {
    const [profile, idea, sponsorProfile] = await Promise.all([
      getDoc(doc(db, "users", supporterId)),
      getDoc(doc(db, "ideas", validation.data.ideaId)),
      getDoc(doc(db, "sponsorProfiles", supporterId)),
    ]);

    if (!profile.exists())
      return messageFailure("Kullanıcı profili bulunamadı.");
    const rawRole: unknown = profile.data().role;
    const role =
      typeof rawRole === "string" ? rawRole.trim().toLowerCase() : rawRole;
    const applicationType = applicationTypeForRole(role);
    if (!applicationType) {
      return messageFailure(
        "Bu hayale yalnızca destekçi, mentor veya sponsor hesapları başvurabilir.",
      );
    }
    if (validation.data.applicationType !== applicationType) {
      return messageFailure("Başvuru türü kullanıcı rolüyle uyumlu değil.");
    }
    if (
      applicationType === "sponsorship" &&
      (!sponsorProfile.exists() ||
        sponsorProfile.data().approvalStatus !== "approved")
    ) {
      return messageFailure(
        "Sponsorluk teklifi göndermek için kurum hesabınızın onaylanması gerekiyor.",
      );
    }
    if (
      applicationType !== "sponsorship" &&
      profile.data().profileCompleted !== true
    ) {
      return messageFailure(
        "Başvuru yapmadan önce profilinizi tamamlamalısınız.",
      );
    }
    if (
      !idea.exists() ||
      idea.data().status !== "approved" ||
      idea.data().visibility === "private"
    ) {
      return messageFailure("Destek verilebilecek fikir bulunamadı.");
    }
    if (idea.data().studentId === supporterId) {
      return messageFailure("Kendi fikrinize destek başvurusu yapamazsınız.");
    }
    const duplicates = await getDocs(
      query(
        collection(db, "supportRequests"),
        where("supporterId", "==", supporterId),
        where("ideaId", "==", validation.data.ideaId),
        where("applicationType", "==", applicationType),
        where("status", "in", ["pending", "approved"]),
        limit(1),
      ),
    );
    if (!duplicates.empty) {
      return messageFailure(
        "Bu hayale aynı başvuru türüyle daha önce başvurdun.",
      );
    }

    const reference = doc(
      db,
      "supportRequests",
      `${supporterId}__${validation.data.ideaId}__${applicationType}`,
    );
    const requestPayload = {
      id: reference.id,
      ideaId: validation.data.ideaId,
      supporterId,
      sponsorId: applicationType === "sponsorship" ? supporterId : null,
      supportTypes: validation.data.supportTypes,
      applicationType,
      applicantRole: role,
      message: validation.data.message,
      contactPreference: validation.data.contactPreference,
      contributionDetails: validation.data.contributionDetails,
      sponsorshipOffer: validation.data.sponsorshipOffer,
      status: "pending" as const,
      adminNote: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[support-request-service] Firestore create payload", {
      path: `supportRequests/${reference.id}`,
      documentId: reference.id,
      fields: Object.keys(requestPayload),
      values: requestPayload,
      authUid: auth.currentUser?.uid ?? null,
      userRole: role,
      sponsorApprovalStatus: sponsorProfile.exists()
        ? (sponsorProfile.data().approvalStatus ?? null)
        : null,
    });
    await runTransaction(db, async (transaction) => {
      const [transactionProfile, transactionIdea, existingRequest] =
        await Promise.all([
          transaction.get(doc(db, "users", supporterId)),
          transaction.get(doc(db, "ideas", validation.data.ideaId)),
          transaction.get(reference),
        ]);
      if (
        !transactionProfile.exists() ||
        !transactionIdea.exists() ||
        transactionIdea.data().status !== "approved"
      ) {
        throw new Error("support-request/not-available");
      }
      if (
        existingRequest.exists() &&
        ["pending", "approved"].includes(existingRequest.data().status)
      ) {
        throw new Error("support-request/duplicate");
      }
      transaction.set(reference, requestPayload);
      // Sponsorship offers are approval applications, not completed support.
      // Keep their transaction scoped to supportRequests so unrelated score,
      // scoreEvents or leaderboard rules cannot roll the offer back.
      if (applicationType !== "sponsorship") {
        applyScoreInTransaction(
          transaction,
          transactionProfile,
          "support",
          reference.id,
          LEADERBOARD_POINTS.supportGiven,
        );
      }
    });

    const ideaOwnerId: unknown = idea.data().studentId;
    const ideaTitle: unknown = idea.data().title;
    const ideaSlug: unknown = idea.data().slug;
    const ideaTarget =
      typeof ideaSlug === "string" && ideaSlug
        ? (`/hayaller/${ideaSlug}` as const)
        : ("/fikirlerim" as const);
    if (typeof ideaOwnerId === "string" && ideaOwnerId) {
      const ownerNotification = await createNotification({
        userId: ideaOwnerId,
        sourceId: reference.id,
        title:
          applicationType === "sponsorship"
            ? "Yeni sponsorluk teklifi"
            : "Yeni destek başvurusu",
        message: `"${typeof ideaTitle === "string" ? ideaTitle : "Hayalin"}" için yeni bir ${applicationType === "sponsorship" ? "sponsorluk teklifi" : "destek başvurusu"} geldi.`,
        type: "support_request_received",
        link: ideaTarget,
      });
      if (!ownerNotification.success) {
        logNotificationError(
          "createSupportRequest:owner",
          ownerNotification.error.message,
        );
      }
    }

    const adminNotification = await notifyAllAdmins({
      sourceId: reference.id,
      title: "Yeni destek başvurusu",
      message: `"${typeof ideaTitle === "string" ? ideaTitle : "Bir hayal"}" için yeni bir destek başvurusu geldi.`,
      type: "new_support_request",
      link: "/admin/destek-basvurulari",
    });
    if (!adminNotification.success) {
      logNotificationError(
        "createSupportRequest:admins",
        adminNotification.error.message,
      );
    }

    return { success: true, data: { id: reference.id } };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "support-request/duplicate"
    ) {
      return messageFailure(
        "Bu hayale aynı başvuru türüyle daha önce başvurdun.",
      );
    }
    return failure(error);
  }
}

async function getRequestsByField(
  field: "supporterId" | "ideaId",
  value: string,
): Promise<SupportRequestServiceResult<SupportRequest[]>> {
  try {
    const snapshots = await getDocs(
      query(collection(db, "supportRequests"), where(field, "==", value)),
    );
    return parseRequests(snapshots);
  } catch (error: unknown) {
    return failure(error);
  }
}

export function getSupportRequestsByUser(userId: string) {
  return getRequestsByField("supporterId", userId);
}

export function getSupportRequestsByIdea(ideaId: string) {
  return getRequestsByField("ideaId", ideaId);
}

export async function getPendingSupportRequests(): Promise<
  SupportRequestServiceResult<SupportRequest[]>
> {
  const adminId = auth.currentUser?.uid;
  if (!adminId) return messageFailure("Bu işlem için yetkiniz yok.");
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;

  try {
    const snapshots = await getDocsFromServer(
      query(
        collection(db, "supportRequests"),
        where("status", "==", "pending"),
        limit(50),
      ),
    );
    return parseRequests(snapshots);
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAdminSupportRequests(
  adminId: string,
): Promise<SupportRequestServiceResult<AdminSupportRequestListItem[]>> {
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;

  try {
    const snapshots = await getDocsFromServer(
      collection(db, "supportRequests"),
    );
    const rawSponsorshipCount = snapshots.docs.filter(
      (snapshot) => snapshot.data().applicationType === "sponsorship",
    ).length;
    console.log("[admin-support-requests] Firestore query result", {
      totalCount: snapshots.size,
      sponsorshipCount: rawSponsorshipCount,
      filters: { collection: "supportRequests", limit: null, orderBy: null },
    });
    const parsedRequests = parseRequests(snapshots);
    if (!parsedRequests.success) return parsedRequests;

    const supporterIds = [
      ...new Set(parsedRequests.data.map((request) => request.supporterId)),
    ];
    const applicants = new Map<
      string,
      { name: string; email: string; role: UserRole }
    >();
    const ideaIds = [
      ...new Set(parsedRequests.data.map((request) => request.ideaId)),
    ];
    const ideas = new Map<string, string>();
    const sponsorOrganizations = new Map<string, string>();

    await Promise.all([
      ...supporterIds.map(async (supporterId) => {
        const profile = await getDocFromServer(doc(db, "users", supporterId));
        if (!profile.exists()) return;

        const rawName: unknown = profile.data().name;
        const rawSurname: unknown = profile.data().surname;
        const rawEmail: unknown = profile.data().email;
        const rawRole: unknown = profile.data().role;
        const name = [rawName, rawSurname]
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
          .map((value) => value.trim())
          .join(" ");

        applicants.set(supporterId, {
          name: name || "Kullanıcı bulunamadı",
          email:
            typeof rawEmail === "string" && rawEmail.trim()
              ? rawEmail.trim()
              : "E-posta bulunamadı",
          role: z.enum(USER_ROLES).catch("supporter").parse(rawRole),
        });
      }),
      ...ideaIds.map(async (ideaId) => {
        const idea = await getDocFromServer(doc(db, "ideas", ideaId));
        const title: unknown = idea.data()?.title;
        ideas.set(
          ideaId,
          typeof title === "string" && title.trim()
            ? title.trim()
            : "Hayal bulunamadı",
        );
      }),
      ...parsedRequests.data
        .filter((request) => request.applicationType === "sponsorship")
        .map(async (request) => {
          const sponsorProfile = await getDocFromServer(
            doc(db, "sponsorProfiles", request.supporterId),
          );
          const institutionName: unknown =
            sponsorProfile.data()?.institutionName;
          if (typeof institutionName === "string" && institutionName.trim()) {
            sponsorOrganizations.set(
              request.supporterId,
              institutionName.trim(),
            );
          }
        }),
    ]);

    return {
      success: true,
      data: parsedRequests.data.map((request) => {
        const applicant = applicants.get(request.supporterId);
        return {
          request,
          applicantName:
            request.applicationType === "sponsorship"
              ? (sponsorOrganizations.get(request.supporterId) ??
                applicant?.name ??
                "Sponsor bulunamadı")
              : (applicant?.name ?? "Kullanıcı bulunamadı"),
          applicantEmail: applicant?.email ?? "E-posta bulunamadı",
          applicantRole: applicant?.role ?? request.applicantRole,
          ideaTitle: ideas.get(request.ideaId) ?? "Hayal bulunamadı",
        };
      }),
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAdminSupportRequestStatistics(
  adminId: string,
): Promise<SupportRequestServiceResult<AdminSupportRequestStatistics>> {
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;

  try {
    const requests = collection(db, "supportRequests");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [total, pending, addedLastThirtyDays] = await Promise.all([
      getCountFromServer(requests),
      getCountFromServer(query(requests, where("status", "==", "pending"))),
      getCountFromServer(
        query(
          requests,
          where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
        ),
      ),
    ]);
    return {
      success: true,
      data: {
        total: total.data().count,
        pending: pending.data().count,
        addedLastThirtyDays: addedLastThirtyDays.data().count,
      },
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

async function reviewSupportRequest(
  requestId: string,
  adminId: string,
  status: "approved" | "rejected",
  adminNote: string,
): Promise<SupportRequestServiceResult<void>> {
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;
  const reviewerId = auth.currentUser?.uid;
  if (!reviewerId) return messageFailure("Bu iÅŸlem iÃ§in yetkiniz yok.");

  try {
    const reference = doc(db, "supportRequests", requestId);
    const reviewedSupportRequest = await runTransaction(
      db,
      async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists() || snapshot.data().status !== "pending") {
          throw new Error("support-request/not-pending");
        }

        const supporterId =
          typeof snapshot.data().supporterId === "string"
            ? snapshot.data().supporterId
            : "";
        const ideaId =
          typeof snapshot.data().ideaId === "string"
            ? snapshot.data().ideaId
            : "";
        let chatId = "";

        const isSponsorship = snapshot.data().applicationType === "sponsorship";
        if (status === "approved") {
          if (!supporterId || !ideaId) {
            throw new Error("support-request/invalid-participants");
          }
          const ideaReference = doc(db, "ideas", ideaId);
          const conversationId = `support__${requestId}`;
          const chatReference = doc(db, "conversations", conversationId);
          const [ideaSnapshot, chatSnapshot, supporterSnapshot] =
            await Promise.all([
              transaction.get(ideaReference),
              transaction.get(chatReference),
              transaction.get(doc(db, "users", supporterId)),
            ]);
          if (!ideaSnapshot.exists() || !supporterSnapshot.exists()) {
            throw new Error("support-request/idea-not-found");
          }
          const ownerId: unknown = ideaSnapshot.data().studentId;
          const ideaTitle: unknown = ideaSnapshot.data().title;
          if (
            typeof ownerId !== "string" ||
            !ownerId ||
            typeof ideaTitle !== "string" ||
            !ideaTitle
          ) {
            throw new Error("support-request/invalid-participants");
          }

          chatId = conversationId;
          if (!chatSnapshot.exists()) {
            transaction.set(chatReference, {
              id: conversationId,
              supportRequestId: requestId,
              mentorshipId: null,
              type: isSponsorship
                ? "sponsorship"
                : snapshot.data().applicationType,
              ideaId,
              ideaTitle,
              ownerId,
              supporterId,
              participantIds: [ownerId, supporterId],
              participantRoles: {
                [ownerId]: "student",
                [supporterId]: snapshot.data().applicantRole,
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastMessage: null,
              lastMessageAt: null,
              unreadCounts: {
                [ownerId]: 0,
                [supporterId]: 0,
              },
            });
          }
          if (!isSponsorship) {
            const achievementGranted = grantAchievementInTransaction(
              transaction,
              supporterId,
              supporterSnapshot.data(),
              "first_support",
            );
            applyScoreInTransaction(
              transaction,
              supporterSnapshot,
              "completed_support",
              requestId,
              LEADERBOARD_POINTS.supportCompleted,
              achievementGranted ? 1 : 0,
            );
          }
        }

        transaction.update(reference, {
          status,
          adminNote,
          reviewedBy: reviewerId,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          supporterId,
          ideaId,
          chatId,
        };
      },
    );

    const reviewedRequest = await getDocFromServer(reference);
    const reviewedData = reviewedRequest.data();
    if (
      !reviewedRequest.exists() ||
      reviewedData?.status !== status ||
      reviewedData.adminNote !== adminNote ||
      reviewedData.reviewedBy !== reviewerId ||
      reviewedData.reviewedAt == null ||
      reviewedData.updatedAt == null
    ) {
      return messageFailure(
        "Destek baÅŸvurusu deÄŸerlendirme bilgileri doÄŸrulanamadÄ±.",
      );
    }

    if (reviewedSupportRequest.supporterId) {
      const ideaSnapshot = reviewedSupportRequest.ideaId
        ? await getDoc(doc(db, "ideas", reviewedSupportRequest.ideaId))
        : null;
      const reviewedIdeaSlug: unknown = ideaSnapshot?.data()?.slug;
      const ideaOwnerId: unknown = ideaSnapshot?.data()?.studentId;
      const isSponsorship = reviewedData?.applicationType === "sponsorship";
      const link =
        status === "approved" && reviewedSupportRequest.chatId
          ? (`/mesajlar?sohbet=${reviewedSupportRequest.chatId}` as const)
          : typeof reviewedIdeaSlug === "string" && reviewedIdeaSlug
            ? (`/hayaller/${reviewedIdeaSlug}` as const)
            : ("/profil?sekme=destekler" as const);
      const notification = await createNotification({
        userId: reviewedSupportRequest.supporterId,
        sourceId: requestId,
        title:
          status === "approved"
            ? isSponsorship
              ? "Sponsorluk teklifin onaylandı"
              : "Destek başvurun onaylandı"
            : isSponsorship
              ? "Sponsorluk teklifin reddedildi"
              : "Destek başvurun reddedildi",
        message:
          status === "approved"
            ? "Destek başvurun yönetici tarafından onaylandı."
            : "Destek başvurun yönetici tarafından reddedildi.",
        type: status === "approved" ? "support_approved" : "support_rejected",
        link,
      });
      if (!notification.success) {
        logNotificationError(
          "reviewSupportRequest",
          notification.error.message,
        );
      }

      if (isSponsorship && typeof ideaOwnerId === "string" && ideaOwnerId) {
        const ownerNotification = await createNotification({
          userId: ideaOwnerId,
          sourceId: requestId,
          title:
            status === "approved"
              ? "Sponsorluk teklifi onaylandı"
              : "Sponsorluk teklifi reddedildi",
          message:
            status === "approved"
              ? "Hayaline gelen sponsorluk teklifi yönetici tarafından onaylandı."
              : "Hayaline gelen sponsorluk teklifi yönetici tarafından reddedildi.",
          type:
            status === "approved"
              ? "sponsorship_offer_approved"
              : "sponsorship_offer_rejected",
          link:
            typeof reviewedIdeaSlug === "string" && reviewedIdeaSlug
              ? `/hayaller/${reviewedIdeaSlug}`
              : "/fikirlerim",
        });
        if (!ownerNotification.success) {
          logNotificationError(
            "reviewSponsorshipOffer:owner",
            ownerNotification.error.message,
          );
        }
      }
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "support-request/not-pending"
    ) {
      return messageFailure("Bu başvuru artık değerlendirme beklemiyor.");
    }
    if (
      error instanceof Error &&
      (error.message === "support-request/invalid-participants" ||
        error.message === "support-request/idea-not-found")
    ) {
      return messageFailure(
        "Sohbet odası için gerekli başvuru veya hayal bilgileri bulunamadı.",
      );
    }
    return failure(error);
  }
}

export function approveSupportRequest(
  requestId: string,
  adminId: string,
  adminNote = "",
) {
  return reviewSupportRequest(requestId, adminId, "approved", adminNote.trim());
}

export function rejectSupportRequest(
  requestId: string,
  adminId: string,
  adminNote: string,
) {
  const normalizedNote = adminNote.trim();
  if (normalizedNote.length < 10) {
    return Promise.resolve(
      messageFailure<void>("Red açıklaması en az 10 karakter olmalıdır."),
    );
  }
  return reviewSupportRequest(requestId, adminId, "rejected", normalizedNote);
}
