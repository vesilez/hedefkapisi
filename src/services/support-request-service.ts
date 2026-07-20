import "client-only";

import { isAdminRole } from "@/constants/roles";
import { SUPPORT_REQUEST_STATUSES } from "@/constants/support-request-statuses";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import { createSupportRequestSchema } from "@/lib/validations/support-request-schema";
import type {
  CreateSupportRequestInput,
  SupportRequest,
} from "@/types/support-request";
import {
  collection,
  doc,
  getDoc,
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

function parseRequests(
  snapshots: Awaited<ReturnType<typeof getDocs>>,
): SupportRequestServiceResult<SupportRequest[]> {
  const requests: SupportRequest[] = [];
  for (const snapshot of snapshots.docs) {
    const parsed = requestSchema.safeParse(snapshot.data());
    if (!parsed.success) {
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
    return parseRequests(snapshots);
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

  try {
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, "supportRequests", requestId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists() || snapshot.data().status !== "pending") {
        throw new Error("support-request/not-pending");
      }
      transaction.update(reference, {
        status,
        adminNote,
        reviewedBy: adminId,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
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
