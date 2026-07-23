import "client-only";

import { isAdminRole, isUserRole, USER_ROLES, type UserRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import { commentContentSchema } from "@/lib/validations/comment-schema";
import { createNotification } from "@/services/notification-service";
import {
  COMMENT_STATUSES,
  type IdeaComment,
} from "@/types/comment";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";

export type CommentServiceResult<T> =
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

  context.addIssue({ code: "custom", message: "Geçersiz yorum tarihi." });
  return z.NEVER;
});

const commentDocumentSchema = z.object({
  id: z.string().min(1),
  ideaId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string(),
  userRole: z.enum(USER_ROLES),
  content: commentContentSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  status: z.enum(COMMENT_STATUSES),
});

function failure<T>(error: unknown): CommentServiceResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

function messageFailure<T>(message: string): CommentServiceResult<T> {
  return { success: false, error: { message } };
}

async function getCurrentUserRole(userId: string): Promise<UserRole | null> {
  const profile = await getDoc(doc(db, "users", userId));
  const role: unknown = profile.exists() ? profile.data().role : null;
  return isUserRole(role) ? role : null;
}

export function subscribeToIdeaComments(
  ideaId: string,
  viewerRole: UserRole | null,
  listener: (result: CommentServiceResult<IdeaComment[]>) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "comments"), where("ideaId", "==", ideaId)),
    (snapshots) => {
      const comments: IdeaComment[] = [];
      for (const snapshot of snapshots.docs) {
        const data: unknown = snapshot.data({ serverTimestamps: "estimate" });
        const parsed = commentDocumentSchema.safeParse({
          ...(typeof data === "object" && data !== null ? data : {}),
          id: snapshot.id,
        });
        if (!parsed.success) {
          console.error("[comment-service] invalid comment", {
            documentId: snapshot.id,
            issues: parsed.error.issues,
          });
          listener(messageFailure("Yorumlar şu anda okunamıyor."));
          return;
        }
        if (parsed.data.status === "hidden" && !isAdminRole(viewerRole)) {
          continue;
        }
        comments.push(parsed.data);
      }

      comments.sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      );
      listener({ success: true, data: comments });
    },
    (error: unknown) => listener(failure(error)),
  );
}

export async function createIdeaComment(
  ideaId: string,
  content: string,
): Promise<CommentServiceResult<IdeaComment>> {
  const validation = commentContentSchema.safeParse(content);
  if (!validation.success) {
    return messageFailure(validation.error.issues[0]?.message ?? "Geçersiz yorum.");
  }

  const userId = auth.currentUser?.uid;
  if (!userId) return messageFailure("Yorum yapmak için giriş yapmalısınız.");

  try {
    const [profile, idea] = await Promise.all([
      getDoc(doc(db, "users", userId)),
      getDoc(doc(db, "ideas", ideaId)),
    ]);
    const role: unknown = profile.exists() ? profile.data().role : null;
    if (!profile.exists() || !isUserRole(role)) {
      return messageFailure("Kullanıcı profili bulunamadı.");
    }
    if (!idea.exists() || idea.data().status !== "approved") {
      return messageFailure("Yorum yapılabilecek hayal bulunamadı.");
    }

    const name: unknown = profile.data().name;
    const surname: unknown = profile.data().surname;
    const userName =
      [name, surname]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim())
        .join(" ") || auth.currentUser?.displayName || "Kullanıcı";
    const reference = doc(collection(db, "comments"));
    const now = new Date().toISOString();

    await setDoc(reference, {
      id: reference.id,
      ideaId,
      userId,
      userName,
      userRole: role,
      content: validation.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "active",
    });

    const ideaOwnerId: unknown = idea.data().studentId;
    if (typeof ideaOwnerId === "string" && ideaOwnerId !== userId) {
      const notification = await createNotification({
        userId: ideaOwnerId,
        title: "Hayaline yeni yorum geldi",
        message: `${userName}, "${typeof idea.data().title === "string" ? idea.data().title : "hayalin"}" için yorum yaptı.`,
        type: "idea_comment",
      });
      if (!notification.success) {
        console.error(
          "[comment-service:create] notification failed:",
          notification.error.message,
        );
      }
    }

    return {
      success: true,
      data: {
        id: reference.id,
        ideaId,
        userId,
        userName,
        userRole: role,
        content: validation.data,
        createdAt: now,
        updatedAt: now,
        status: "active",
      },
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateIdeaComment(
  commentId: string,
  content: string,
): Promise<CommentServiceResult<{ content: string; updatedAt: string }>> {
  const validation = commentContentSchema.safeParse(content);
  if (!validation.success) {
    return messageFailure(validation.error.issues[0]?.message ?? "Geçersiz yorum.");
  }
  const userId = auth.currentUser?.uid;
  if (!userId) return messageFailure("Bu işlem için giriş yapmalısınız.");

  try {
    const reference = doc(db, "comments", commentId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists() || snapshot.data().userId !== userId) {
        throw new Error("comment/not-owner");
      }
      transaction.update(reference, {
        content: validation.data,
        updatedAt: serverTimestamp(),
      });
    });
    return {
      success: true,
      data: { content: validation.data, updatedAt: new Date().toISOString() },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "comment/not-owner") {
      return messageFailure("Yalnızca kendi yorumunuzu düzenleyebilirsiniz.");
    }
    return failure(error);
  }
}

export async function deleteIdeaComment(
  commentId: string,
): Promise<CommentServiceResult<void>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return messageFailure("Bu işlem için giriş yapmalısınız.");

  try {
    const reference = doc(db, "comments", commentId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return messageFailure("Yorum bulunamadı.");

    if (snapshot.data().userId !== userId) {
      const role = await getCurrentUserRole(userId);
      if (!isAdminRole(role)) {
        return messageFailure("Bu yorumu silme yetkiniz yok.");
      }
    }

    await deleteDoc(reference);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function hideIdeaComment(
  commentId: string,
): Promise<CommentServiceResult<void>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return messageFailure("Bu işlem için giriş yapmalısınız.");

  try {
    const role = await getCurrentUserRole(userId);
    if (!isAdminRole(role)) {
      return messageFailure("Bu yorumu gizleme yetkiniz yok.");
    }

    const reference = doc(db, "comments", commentId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return messageFailure("Yorum bulunamadı.");
    await setDoc(
      reference,
      { status: "hidden", updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}
