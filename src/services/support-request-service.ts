import "client-only";

import { isAdminRole } from "@/constants/roles";
import { SUPPORT_REQUEST_STATUSES } from "@/constants/support-request-statuses";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import { createSupportRequestSchema } from "@/lib/validations/support-request-schema";
import {
  createNotification,
  notifyAllAdmins,
} from "@/services/notification-service";
import type {
  CreateSupportRequestInput,
  SupportRequest,
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
  setDoc,
  where,
} from "firebase/firestore";
import { z } from "zod";

export type SupportRequestServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

export interface AdminSupportRequestListItem {
  request: SupportRequest;
  applicantName: string;
  applicantEmail: string;
}

export interface AdminSupportRequestStatistics {
  pending: number;
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
  supportTypes: z.array(z.enum(SUPPORT_TYPES)),
  message: z.string(),
  status: z.enum(SUPPORT_REQUEST_STATUSES),
  adminNote: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.union([timestampSchema, z.null()]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

function failure<T>(error: unknown): SupportRequestServiceResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
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

async function ensureAdmin(adminId: string): Promise<SupportRequestServiceResult<void>> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return messageFailure("Bu işlem için yetkiniz yok.");
  }
  try {
    const profile = await getDoc(doc(db, "users", adminId));
    const rawRole: unknown = profile.exists() ? profile.data().role : null;
    const role = typeof rawRole === "string" ? rawRole.trim().toLowerCase() : rawRole;
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
  if (!supporterId) return messageFailure("Başvuru yapmak için giriş yapmalısınız.");

  try {
    const [profile, idea, duplicates] = await Promise.all([
      getDoc(doc(db, "users", supporterId)),
      getDoc(doc(db, "ideas", validation.data.ideaId)),
      getDocs(
        query(
          collection(db, "supportRequests"),
          where("supporterId", "==", supporterId),
          where("ideaId", "==", validation.data.ideaId),
          where("status", "==", "pending"),
          limit(1),
        ),
      ),
    ]);

    if (!profile.exists()) return messageFailure("Kullanıcı profili bulunamadı.");
    const rawRole: unknown = profile.data().role;
    const role = typeof rawRole === "string" ? rawRole.trim().toLowerCase() : rawRole;
    if (role !== "supporter" && role !== "mentor") {
      return messageFailure(
        "Bu fikir için destek başvurusu yalnızca destekçi veya mentor hesaplarıyla yapılabilir.",
      );
    }
    if (profile.data().profileCompleted !== true) {
      return messageFailure("Başvuru yapmadan önce profilinizi tamamlamalısınız.");
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
    if (!duplicates.empty) {
      return messageFailure(
        "Bu fikir için zaten değerlendirme bekleyen bir destek başvurun var.",
      );
    }

    const reference = doc(collection(db, "supportRequests"));
    await setDoc(reference, {
      id: reference.id,
      ideaId: validation.data.ideaId,
      supporterId,
      supportTypes: validation.data.supportTypes,
      message: validation.data.message,
      status: "pending",
      adminNote: "",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const ideaOwnerId: unknown = idea.data().studentId;
    const ideaTitle: unknown = idea.data().title;
    if (typeof ideaOwnerId === "string" && ideaOwnerId) {
      const ownerNotification = await createNotification({
        userId: ideaOwnerId,
        title: "Yeni destek başvurusu",
        message: `"${typeof ideaTitle === "string" ? ideaTitle : "Hayalin"}" için yeni bir destek başvurusu geldi.`,
        type: "support_request_received",
      });
      if (!ownerNotification.success) {
        logNotificationError(
          "createSupportRequest:owner",
          ownerNotification.error.message,
        );
      }
    }

    const adminNotification = await notifyAllAdmins({
      title: "Yeni destek başvurusu",
      message: `"${typeof ideaTitle === "string" ? ideaTitle : "Bir hayal"}" için yeni bir destek başvurusu geldi.`,
      type: "new_support_request",
    });
    if (!adminNotification.success) {
      logNotificationError(
        "createSupportRequest:admins",
        adminNotification.error.message,
      );
    }

    return { success: true, data: { id: reference.id } };
  } catch (error: unknown) {
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
    if (process.env.NODE_ENV === "development") {
      console.info("[support-requests] pending documents:", snapshots.size);
      for (const snapshot of snapshots.docs) {
        const status: unknown = snapshot.data().status;
        console.info("[support-requests] document:", {
          id: snapshot.id,
          status: typeof status === "string" ? status : "invalid",
        });
      }
    }
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
    const parsedRequests = parseRequests(snapshots);
    if (!parsedRequests.success) return parsedRequests;

    const supporterIds = [
      ...new Set(parsedRequests.data.map((request) => request.supporterId)),
    ];
    const applicants = new Map<
      string,
      { name: string; email: string }
    >();

    await Promise.all(
      supporterIds.map(async (supporterId) => {
        const profile = await getDocFromServer(doc(db, "users", supporterId));
        if (!profile.exists()) return;

        const rawName: unknown = profile.data().name;
        const rawSurname: unknown = profile.data().surname;
        const rawEmail: unknown = profile.data().email;
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
        });
      }),
    );

    return {
      success: true,
      data: parsedRequests.data.map((request) => {
        const applicant = applicants.get(request.supporterId);
        return {
          request,
          applicantName: applicant?.name ?? "Kullanıcı bulunamadı",
          applicantEmail: applicant?.email ?? "E-posta bulunamadı",
        };
      }),
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAdminSupportRequestStatistics(
  adminId: string,
): Promise<
  SupportRequestServiceResult<AdminSupportRequestStatistics>
> {
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;

  try {
    const pending = await getCountFromServer(
      query(
        collection(db, "supportRequests"),
        where("status", "==", "pending"),
      ),
    );
    return { success: true, data: { pending: pending.data().count } };
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

      const reviewData = {
        status,
        adminNote,
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.update(reference, reviewData);
        return {
          supporterId:
            typeof snapshot.data().supporterId === "string"
              ? snapshot.data().supporterId
              : "",
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
      const notification = await createNotification({
        userId: reviewedSupportRequest.supporterId,
        title:
          status === "approved"
            ? "Destek başvurun onaylandı"
            : "Destek başvurun reddedildi",
        message:
          status === "approved"
            ? "Destek başvurun yönetici tarafından onaylandı."
            : "Destek başvurun yönetici tarafından reddedildi.",
        type:
          status === "approved"
            ? "support_request_approved"
            : "support_request_rejected",
      });
      if (!notification.success) {
        logNotificationError(
          "reviewSupportRequest",
          notification.error.message,
        );
      }
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "support-request/not-pending") {
      return messageFailure("Bu başvuru artık değerlendirme beklemiyor.");
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
