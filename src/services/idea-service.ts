import "client-only";

import { IDEA_STATUSES } from "@/constants/idea-statuses";
import { isAdminRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import {
  ideaFormSchema,
  type IdeaFormInput,
} from "@/lib/validations/idea-schema";
import { slugify } from "@/lib/utils/slugify";
import {
  IDEA_VISIBILITIES,
  type Idea,
  type IdeaListItem,
  type PublicIdeaFilters,
  type IdeaSubmitAction,
} from "@/types/idea";
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
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

export { getPublicIdeaBySlug } from "./public-idea-service";

export type IdeaServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface IdeaMutationInput extends IdeaFormInput {
  submitAction: IdeaSubmitAction;
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

  context.addIssue({ code: "custom", message: "Geçersiz tarih değeri." });
  return z.NEVER;
});

const nullableTimestampSchema = z
  .union([timestampSchema, z.null()])
  .transform((value) => value);

const ideaDocumentSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  problem: z.string(),
  solution: z.string(),
  targetAudience: z.string(),
  categoryId: z.string(),
  city: z.string().nullable(),
  stage: ideaFormSchema.shape.stage,
  supportNeeds: ideaFormSchema.shape.supportNeeds,
  visibility: z.enum(IDEA_VISIBILITIES),
  status: z.enum(IDEA_STATUSES),
  adminNote: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  revisionNote: z.string().nullable(),
  isFeatured: z.boolean(),
  viewCount: z.number(),
  supportCount: z.number(),
  coverImageUrl: z.string().nullable(),
  attachmentUrls: z.array(z.string()),
  prototypeUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  publishedAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  moderatedBy: z.string().nullable().optional().default(null),
  moderatedAt: nullableTimestampSchema.optional().default(null),
});

const ideaListItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  shortDescription: z.string(),
  categoryId: z.string(),
  city: z.string().nullable(),
  stage: ideaFormSchema.shape.stage,
  supportNeeds: ideaFormSchema.shape.supportNeeds,
  visibility: z.enum(["public", "anonymous"]),
  isFeatured: z.boolean(),
  supportCount: z.number(),
  coverImageUrl: z.string().nullable(),
  createdAt: timestampSchema,
});

function failure<T>(error: unknown): IdeaServiceResult<T> {
  return {
    success: false,
    error: {
      code: getFirebaseErrorCode(error) ?? "firestore/unknown",
      message: getFirebaseErrorMessage(error),
    },
  };
}

function logDevelopmentError(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== "development") return;

  console.error(`[idea-service:${context}]`, {
    code: getFirebaseErrorCode(error) ?? "firestore/unknown",
  });
}

function validationFailure<T>(message: string): IdeaServiceResult<T> {
  return {
    success: false,
    error: { code: "validation/invalid-idea", message },
  };
}

function statusFromAction(action: IdeaSubmitAction) {
  return action === "draft" ? ("draft" as const) : ("pending" as const);
}

async function ensureAdmin(adminId: string): Promise<IdeaServiceResult<void>> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return {
      success: false,
      error: {
        code: "idea/unauthorized",
        message: "Bu işlem için yetkiniz yok.",
      },
    };
  }

  try {
    const profile = await getDoc(doc(db, "users", adminId));
    const role = profile.exists() ? profile.data().role : null;
    if (!isAdminRole(role)) {
      return {
        success: false,
        error: {
          code: "idea/unauthorized",
          message: "Bu işlem için yetkiniz yok.",
        },
      };
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

function parseInput(input: IdeaMutationInput) {
  if (
    input.submitAction !== "draft" &&
    input.submitAction !== "submit_for_review"
  ) {
    return null;
  }

  return ideaFormSchema.safeParse(input);
}

function editableData(input: z.output<typeof ideaFormSchema>) {
  return {
    title: input.title,
    shortDescription: input.shortDescription,
    description: input.description,
    problem: input.problem,
    solution: input.solution,
    targetAudience: input.targetAudience,
    categoryId: input.categoryId,
    city: input.city,
    stage: input.stage,
    supportNeeds: input.supportNeeds,
    visibility: input.visibility,
    coverImageUrl: input.coverImageUrl || null,
    attachmentUrls: input.attachmentUrls,
    prototypeUrl: input.prototypeUrl || null,
    githubUrl: input.githubUrl || null,
    websiteUrl: input.websiteUrl || null,
  };
}

export async function createIdea(
  studentId: string,
  input: IdeaMutationInput,
): Promise<IdeaServiceResult<{ id: string }>> {
  const validation = parseInput(input);
  if (!studentId || !validation?.success) {
    return validationFailure(
      validation && !validation.success
        ? (validation.error.issues[0]?.message ?? "Fikir bilgileri geçersiz.")
        : "Fikir kaydı için kullanıcı bilgisi bulunamadı.",
    );
  }

  if (auth.currentUser?.uid !== studentId) {
    return {
      success: false,
      error: {
        code: "idea/unauthorized",
        message: "Bu kullanıcı adına fikir oluşturamazsınız.",
      },
    };
  }

  const ideaReference = doc(collection(db, "ideas"));
  const generatedSlug = slugify(validation.data.title);

  try {
    const profile = await getDoc(doc(db, "users", studentId));
    if (
      !profile.exists() ||
      profile.data().role !== "student" ||
      profile.data().profileCompleted !== true
    ) {
      return {
        success: false,
        error: {
          code: "idea/student-profile-required",
          message: "Fikir paylaşmak için öğrenci profilinizi tamamlamalısınız.",
        },
      };
    }

    await setDoc(ideaReference, {
      id: ideaReference.id,
      studentId,
      ...editableData(validation.data),
      slug: generatedSlug || `idea-${ideaReference.id.slice(0, 8)}`,
      status: statusFromAction(input.submitAction),
      adminNote: "",
      rejectionReason: null,
      revisionNote: null,
      isFeatured: false,
      viewCount: 0,
      supportCount: 0,
      publishedAt: null,
      moderatedBy: null,
      moderatedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, data: { id: ideaReference.id } };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getIdeaForEdit(
  ideaId: string,
  studentId: string,
): Promise<IdeaServiceResult<Idea | null>> {
  if (!ideaId || !studentId || auth.currentUser?.uid !== studentId) {
    return { success: true, data: null };
  }

  try {
    const snapshot = await getDocFromServer(doc(db, "ideas", ideaId));
    if (!snapshot.exists() || snapshot.data().studentId !== studentId) {
      return { success: true, data: null };
    }

    const data: unknown = snapshot.data();
    const parsed = ideaDocumentSchema.safeParse({
      ...(typeof data === "object" && data !== null ? data : {}),
      id: snapshot.id,
    });
    if (!parsed.success || parsed.data.studentId !== studentId) {
      return validationFailure("Fikir verileri okunamadı.");
    }

    return { success: true, data: parsed.data };
  } catch (error: unknown) {
    logDevelopmentError("getIdeaForEdit", error);
    return failure(error);
  }
}

export async function updateIdea(
  ideaId: string,
  studentId: string,
  input: IdeaFormInput,
  submitAction: IdeaSubmitAction,
): Promise<IdeaServiceResult<void>> {
  const validation = ideaFormSchema.safeParse(input);
  if (!ideaId || !studentId || !validation.success) {
    return validationFailure(
      validation.success
        ? "Fikir güncelleme bilgileri geçersiz."
        : (validation.error.issues[0]?.message ??
            "Fikir güncelleme bilgileri geçersiz."),
    );
  }
  if (
    auth.currentUser?.uid !== studentId ||
    (submitAction !== "draft" && submitAction !== "submit_for_review")
  ) {
    return {
      success: false,
      error: {
        code: "idea/unauthorized",
        message: "Fikir bulunamadı veya erişim yetkin yok.",
      },
    };
  }

  const reference = doc(db, "ideas", ideaId);
  try {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists() || snapshot.data().studentId !== studentId) {
        throw new Error("idea/not-found-or-forbidden");
      }
      const currentStatus: unknown = snapshot.data().status;
      if (
        currentStatus !== "draft" &&
        currentStatus !== "revision_requested"
      ) {
        throw new Error("idea/not-editable");
      }

      const nextStatus =
        submitAction === "submit_for_review" ? "pending" : currentStatus;
      const generatedSlug = slugify(validation.data.title);
      transaction.update(reference, {
        ...editableData(validation.data),
        slug: generatedSlug || `idea-${ideaId.slice(0, 8)}`,
        status: nextStatus,
        rejectionReason: null,
        revisionNote:
          submitAction === "submit_for_review"
            ? null
            : (snapshot.data().revisionNote ?? null),
        publishedAt: null,
        moderatedBy: null,
        moderatedAt: null,
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "idea/not-found-or-forbidden"
    ) {
      return {
        success: false,
        error: {
          code: "idea/not-found-or-forbidden",
          message: "Fikir bulunamadı veya erişim yetkin yok.",
        },
      };
    }
    if (error instanceof Error && error.message === "idea/not-editable") {
      return {
        success: false,
        error: {
          code: "idea/not-editable",
          message: "Bu fikir mevcut durumunda düzenlenemez.",
        },
      };
    }
    logDevelopmentError("updateIdea", error);
    return failure(error);
  }
}

export async function getIdeaById(
  ideaId: string,
): Promise<IdeaServiceResult<Idea | null>> {
  try {
    const snapshot = await getDoc(doc(db, "ideas", ideaId));
    if (!snapshot.exists()) return { success: true, data: null };

    const parsed = ideaDocumentSchema.safeParse(snapshot.data());
    if (!parsed.success) {
      return validationFailure("Fikir verileri okunamadı.");
    }

    return { success: true, data: parsed.data };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getIdeasByStudent(
  studentId: string,
): Promise<IdeaServiceResult<Idea[]>> {
  if (!studentId || auth.currentUser?.uid !== studentId) {
    return {
      success: false,
      error: {
        code: "idea/unauthorized",
        message: "Bu kullanıcının fikirlerini görüntüleyemezsiniz.",
      },
    };
  }

  try {
    const snapshots = await getDocsFromServer(
      query(collection(db, "ideas"), where("studentId", "==", studentId)),
    );

    if (process.env.NODE_ENV === "development") {
      console.info("[idea-service:getIdeasByStudent] query:", {
        authUid: auth.currentUser.uid,
        ownerField: "studentId",
        documentCount: snapshots.size,
      });
      for (const snapshot of snapshots.docs) {
        const rawStudentId: unknown = snapshot.data().studentId;
        console.info("[idea-service:getIdeasByStudent] document:", {
          id: snapshot.id,
          studentId:
            typeof rawStudentId === "string" ? rawStudentId : "invalid",
        });
      }
    }
    const ideas: Idea[] = [];

    for (const snapshot of snapshots.docs) {
      const data: unknown = snapshot.data();
      const parsed = ideaDocumentSchema.safeParse({
        ...(typeof data === "object" && data !== null ? data : {}),
        id: snapshot.id,
      });
      if (!parsed.success)
        return validationFailure("Fikir verileri okunamadı.");
      if (parsed.data.studentId !== studentId) continue;
      ideas.push(parsed.data);
    }

    ideas.sort((firstIdea, secondIdea) =>
      secondIdea.createdAt.localeCompare(firstIdea.createdAt),
    );
    return { success: true, data: ideas.slice(0, 50) };
  } catch (error: unknown) {
    logDevelopmentError("getIdeasByStudent", error);
    return failure(error);
  }
}

export async function getPublicIdeas(
  filters: PublicIdeaFilters = {},
): Promise<IdeaServiceResult<IdeaListItem[]>> {
  try {
    const snapshots = await getDocs(
      query(
        collection(db, "ideas"),
        where("status", "==", "approved"),
        limit(24),
      ),
    );

    const ideas: IdeaListItem[] = [];
    for (const snapshot of snapshots.docs) {
      if (snapshot.data().visibility === "private") continue;

      const parsed = ideaListItemSchema.safeParse(snapshot.data());
      if (!parsed.success) {
        return validationFailure("Hayal verileri okunamadı.");
      }
      ideas.push(parsed.data);
    }

    ideas.sort((firstIdea, secondIdea) =>
      secondIdea.createdAt.localeCompare(firstIdea.createdAt),
    );

    const search = filters.search?.trim().toLocaleLowerCase("tr-TR");
    const city = filters.city?.trim().toLocaleLowerCase("tr-TR");
    const filteredIdeas = ideas.filter((idea) => {
      const matchesSearch =
        !search ||
        idea.title.toLocaleLowerCase("tr-TR").includes(search) ||
        idea.shortDescription.toLocaleLowerCase("tr-TR").includes(search);
      const matchesCategory =
        !filters.categoryId || idea.categoryId === filters.categoryId;
      const matchesStage = !filters.stage || idea.stage === filters.stage;
      const matchesCity =
        !city || idea.city?.toLocaleLowerCase("tr-TR").includes(city);

      return matchesSearch && matchesCategory && matchesStage && matchesCity;
    });

    return { success: true, data: filteredIdeas };
  } catch (error: unknown) {
    logDevelopmentError("getPublicIdeas", error);
    return failure(error);
  }
}

export async function getPendingIdeas(): Promise<IdeaServiceResult<Idea[]>> {
  try {
    const snapshots = await getDocsFromServer(
      query(
        collection(db, "ideas"),
        where("status", "==", "pending"),
        limit(50),
      ),
    );
    const ideas: Idea[] = [];

    for (const snapshot of snapshots.docs) {
      const parsed = ideaDocumentSchema.safeParse(snapshot.data());
      if (!parsed.success) {
        return validationFailure("Moderasyon verileri okunamadı.");
      }
      ideas.push(parsed.data);
    }

    ideas.sort((firstIdea, secondIdea) =>
      firstIdea.createdAt.localeCompare(secondIdea.createdAt),
    );
    return { success: true, data: ideas };
  } catch (error: unknown) {
    logDevelopmentError("getPendingIdeas", error);
    return failure(error);
  }
}

async function moderateIdea(
  ideaId: string,
  adminId: string,
  update: Readonly<Record<string, unknown>>,
): Promise<IdeaServiceResult<void>> {
  const authorization = await ensureAdmin(adminId);
  if (!authorization.success) return authorization;

  try {
    await runTransaction(db, async (transaction) => {
      const ideaReference = doc(db, "ideas", ideaId);
      const snapshot = await transaction.get(ideaReference);
      if (!snapshot.exists() || snapshot.data().status !== "pending") {
        throw new Error("idea/not-pending");
      }

      transaction.update(ideaReference, {
        ...update,
        moderatedBy: adminId,
        moderatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "idea/not-pending") {
      return {
        success: false,
        error: {
          code: "idea/not-pending",
          message: "Bu fikir artık onay beklemiyor. Listeyi yenileyin.",
        },
      };
    }
    return failure(error);
  }
}

export async function approveIdea(
  ideaId: string,
  adminId: string,
): Promise<IdeaServiceResult<void>> {
  return moderateIdea(ideaId, adminId, {
    status: "approved",
    adminNote: "Onaylandı.",
    rejectionReason: null,
    revisionNote: null,
    publishedAt: serverTimestamp(),
  });
}

export async function rejectIdea(
  ideaId: string,
  adminId: string,
  reason: string,
): Promise<IdeaServiceResult<void>> {
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10) {
    return validationFailure("Red nedeni en az 10 karakter olmalıdır.");
  }

  return moderateIdea(ideaId, adminId, {
    status: "rejected",
    adminNote: "",
    rejectionReason: normalizedReason,
    revisionNote: null,
    publishedAt: null,
  });
}

export async function requestIdeaRevision(
  ideaId: string,
  adminId: string,
  note: string,
): Promise<IdeaServiceResult<void>> {
  const normalizedNote = note.trim();
  if (normalizedNote.length < 10) {
    return validationFailure(
      "Revizyon açıklaması en az 10 karakter olmalıdır.",
    );
  }

  return moderateIdea(ideaId, adminId, {
    status: "revision_requested",
    adminNote: "",
    rejectionReason: null,
    revisionNote: normalizedNote,
    publishedAt: null,
  });
}
