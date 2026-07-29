import "client-only";

import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import {
  feedbackInputSchema,
  type FeedbackInput,
} from "@/lib/validations/feedback-schema";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackStatus,
  type PilotFeedback,
} from "@/types/feedback";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { z } from "zod";

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const timestampSchema = z.unknown().transform((value, context) => {
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const toDate = Reflect.get(value, "toDate");
    if (typeof toDate === "function") {
      const date: unknown = Reflect.apply(toDate, value, []);
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const feedbackSchema = z.object({
  id: z.string().min(1),
  type: z.enum(FEEDBACK_TYPES),
  title: z.string(),
  description: z.string(),
  pagePath: z.string(),
  userId: z.string().min(1),
  userName: z.string(),
  userEmail: z.string(),
  status: z.enum(FEEDBACK_STATUSES),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

function failure<T>(error: unknown): Result<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

export async function createFeedback(
  input: FeedbackInput,
): Promise<Result<void>> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: { message: "Geri bildirim göndermek için giriş yapmalısınız." },
      };
    }
    const values = feedbackInputSchema.parse(input);
    const userSnapshot = await getDoc(doc(db, "users", currentUser.uid));
    if (!userSnapshot.exists()) {
      return {
        success: false,
        error: { message: "Kullanıcı profiliniz bulunamadı." },
      };
    }
    const user = userSnapshot.data();
    const reference = doc(collection(db, "feedback"));
    await setDoc(reference, {
      id: reference.id,
      ...values,
      userId: currentUser.uid,
      userName: `${String(user.name ?? "")} ${String(user.surname ?? "")}`.trim(),
      userEmail: currentUser.email ?? "",
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getFeedbackForAdmin(): Promise<
  Result<PilotFeedback[]>
> {
  try {
    const snapshots = await getDocs(
      query(collection(db, "feedback"), orderBy("createdAt", "desc")),
    );
    const data = snapshots.docs.flatMap((snapshot) => {
      const parsed = feedbackSchema.safeParse(snapshot.data());
      return parsed.success ? [parsed.data] : [];
    });
    return { success: true, data };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<Result<void>> {
  try {
    const validStatus = z.enum(FEEDBACK_STATUSES).parse(status);
    await updateDoc(doc(db, "feedback", feedbackId), {
      status: validStatus,
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}
