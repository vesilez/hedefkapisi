import "client-only";

import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import {
  NOTIFICATION_TYPES,
  type Notification,
  type NotificationType,
} from "@/types/notification";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";

export type NotificationServiceResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

export interface CreateNotificationInput {
  userId: string;
  sourceId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: `/${string}`;
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

  context.addIssue({ code: "custom", message: "Geçersiz bildirim tarihi." });
  return z.NEVER;
});

const notificationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  message: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  link: z.string().regex(/^\/(?!\/)/).nullable().optional(),
  read: z.boolean().optional(),
  // Deployed v1 documents are normalized while new writes use link/read.
  targetUrl: z.string().regex(/^\/(?!\/)/).nullable().optional(),
  isRead: z.boolean().optional(),
  createdAt: timestampSchema,
}).transform((value): Notification => ({
  id: value.id,
  userId: value.userId,
  title: value.title,
  message: value.message,
  type: value.type,
  link: value.link ?? value.targetUrl ?? null,
  read: value.read ?? value.isRead ?? false,
  createdAt: value.createdAt,
}));

function failure<T>(error: unknown): NotificationServiceResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

function isPermissionDenied(error: unknown): boolean {
  const code = getFirebaseErrorCode(error);
  return code === "permission-denied" || code === "firestore/permission-denied";
}

function notificationData(input: CreateNotificationInput) {
  const actorId = auth.currentUser?.uid;
  if (!actorId) throw new Error("notification/unauthenticated");
  return {
    userId: input.userId,
    actorId,
    sourceId: input.sourceId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link ?? null,
    read: false,
    createdAt: serverTimestamp(),
  };
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationServiceResult<void>> {
  try {
    const reference = doc(collection(db, "notifications"));
    await setDoc(reference, { id: reference.id, ...notificationData(input) });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function notifyAllAdmins(
  input: Omit<CreateNotificationInput, "userId">,
): Promise<NotificationServiceResult<void>> {
  try {
    const admins = await getDocs(
      query(
        collection(db, "users"),
        where("role", "in", ["admin", "superadmin"]),
      ),
    );
    const batch = writeBatch(db);

    for (const admin of admins.docs) {
      const reference = doc(collection(db, "notifications"));
      batch.set(reference, {
        id: reference.id,
        ...notificationData({ ...input, userId: admin.id }),
      });
    }

    await batch.commit();
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export function subscribeToNotifications(
  userId: string,
  listener: (result: NotificationServiceResult<Notification[]>) => void,
  maximum = 20,
): Unsubscribe {
  if (!userId || auth.currentUser?.uid !== userId) {
    console.warn("[notifications] Subscription skipped", {
      requestedUserId: userId,
      authenticatedUserId: auth.currentUser?.uid ?? null,
      reason: "authenticated-user-mismatch",
    });
    queueMicrotask(() => listener({ success: true, data: [] }));
    return () => undefined;
  }

  return onSnapshot(
    query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(maximum),
    ),
    (snapshots) => {
      const notifications: Notification[] = [];
      for (const snapshot of snapshots.docs) {
        const data: unknown = snapshot.data({ serverTimestamps: "estimate" });
        const parsed = notificationSchema.safeParse({
          ...(typeof data === "object" && data !== null ? data : {}),
          id: snapshot.id,
        });
        if (!parsed.success) {
          console.error("[notifications] invalid document", {
            documentId: snapshot.id,
            issues: parsed.error.issues,
          });
          listener({
            success: false,
            error: { message: "Bildirimler okunamadı." },
          });
          return;
        }
        notifications.push(parsed.data);
      }

      listener({ success: true, data: notifications });
    },
    (error: unknown) => {
      console.error("[notifications] Firestore subscription failed", {
        collection: "notifications",
        userId,
        code: getFirebaseErrorCode(error) ?? "firestore/unknown",
        error,
      });
      if (isPermissionDenied(error)) {
        listener({ success: true, data: [] });
        return;
      }
      listener(failure(error));
    },
  );
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<NotificationServiceResult<void>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return failure(new Error("Bildirim için oturum gerekli."));

  try {
    const reference = doc(db, "notifications", notificationId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists() || snapshot.data().userId !== userId) {
      return failure(new Error("Bildirime erişim yetkiniz yok."));
    }
    await setDoc(reference, { read: true }, { merge: true });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<NotificationServiceResult<void>> {
  if (!userId || auth.currentUser?.uid !== userId) {
    return failure(new Error("Bildirimler için oturum gerekli."));
  }

  try {
    const snapshots = await getDocs(
      query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("read", "==", false),
      ),
    );
    const batch = writeBatch(db);
    for (const snapshot of snapshots.docs) {
      batch.set(snapshot.ref, { read: true }, { merge: true });
    }
    await batch.commit();
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}
