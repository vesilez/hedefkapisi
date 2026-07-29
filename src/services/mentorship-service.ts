import "client-only";

import { isAdminRole, isUserRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import {
  mentorEvaluationSchema,
  mentorNoteSchema,
  mentorshipRequestSchema,
  type MentorEvaluationInput,
  type MentorshipRequestInput,
} from "@/lib/validations/mentorship-schema";
import { getPublicIdeas } from "@/services/idea-service";
import type {
  MentorDashboardData,
  MentorEvaluation,
  MentorNote,
  Mentorship,
  MentorshipStatus,
  PublicMentorProfile,
} from "@/types/mentorship";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { z } from "zod";

export type MentorshipResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

const timestampSchema = z.unknown().transform((value, context) => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const nullableTimestampSchema = z.union([timestampSchema, z.null()]);

const publicMentorSchema = z.object({
  mentorId: z.string().min(1),
  name: z.string(),
  surname: z.string(),
  avatarUrl: z.string().nullable().optional().default(null),
  city: z.string().nullable().optional().default(null),
  profession: z.string(),
  organization: z.string(),
  expertiseAreas: z.array(z.string()),
  mentoringTopics: z.array(z.string()),
  availability: z.string(),
  biography: z.string(),
});

const mentorshipSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
  mentorId: z.string().min(1),
  studentName: z.string(),
  mentorName: z.string(),
  message: z.string(),
  focusAreas: z.array(z.string()),
  status: z.enum(["pending", "active", "rejected", "completed", "cancelled"]),
  chatId: z.string().nullable(),
  respondedAt: nullableTimestampSchema,
  completedAt: nullableTimestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const mentorNoteDocumentSchema = z.object({
  id: z.string().min(1),
  mentorshipId: z.string().min(1),
  mentorId: z.string().min(1),
  studentId: z.string().min(1),
  content: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const mentorEvaluationDocumentSchema = z.object({
  id: z.string().min(1),
  mentorshipId: z.string().min(1),
  mentorId: z.string().min(1),
  studentId: z.string().min(1),
  progress: z.number().int().min(1).max(5),
  summary: z.string(),
  nextSteps: z.string(),
  createdAt: timestampSchema,
});

function failure<T>(error: unknown): MentorshipResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

function messageFailure<T>(message: string): MentorshipResult<T> {
  return { success: false, error: { message } };
}

function fullName(data: DocumentData): string {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const surname = typeof data.surname === "string" ? data.surname.trim() : "";
  return `${name} ${surname}`.trim() || "Kullanıcı";
}

function parseMentorship(
  snapshot:
    QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): Mentorship | null {
  const parsed = mentorshipSchema.safeParse({
    ...snapshot.data(),
    id: snapshot.id,
  });
  return parsed.success ? parsed.data : null;
}

async function currentProfile() {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? snapshot : null;
}

export async function getPublicMentors(): Promise<
  MentorshipResult<PublicMentorProfile[]>
> {
  try {
    const snapshots = await getDocs(collection(db, "mentorProfiles"));
    const mentors = snapshots.docs.flatMap((snapshot) => {
      const parsed = publicMentorSchema.safeParse(snapshot.data());
      return parsed.success ? [parsed.data] : [];
    });
    mentors.sort((first, second) =>
      `${first.name} ${first.surname}`.localeCompare(
        `${second.name} ${second.surname}`,
        "tr",
      ),
    );
    return { success: true, data: mentors };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function createMentorshipRequest(
  input: MentorshipRequestInput,
): Promise<MentorshipResult<{ id: string }>> {
  const validation = mentorshipRequestSchema.safeParse(input);
  if (!validation.success) {
    return messageFailure(
      validation.error.issues[0]?.message ?? "Talep bilgileri geçersiz.",
    );
  }

  const studentId = auth.currentUser?.uid;
  if (!studentId)
    return messageFailure("Talep göndermek için giriş yapmalısın.");

  try {
    const duplicate = await getDocs(
      query(
        collection(db, "mentorships"),
        where("studentId", "==", studentId),
        where("mentorId", "==", validation.data.mentorId),
        where("status", "in", ["pending", "active"]),
        limit(1),
      ),
    );
    if (!duplicate.empty) {
      return messageFailure("Bu mentorla devam eden bir talebin zaten var.");
    }

    const reference = doc(collection(db, "mentorships"));
    await runTransaction(db, async (transaction) => {
      const [student, mentor, mentorProfile] = await Promise.all([
        transaction.get(doc(db, "users", studentId)),
        transaction.get(doc(db, "users", validation.data.mentorId)),
        transaction.get(doc(db, "mentorProfiles", validation.data.mentorId)),
      ]);
      if (
        !student.exists() ||
        student.data().role !== "student" ||
        !mentor.exists() ||
        mentor.data().role !== "mentor" ||
        !mentorProfile.exists()
      ) {
        throw new Error("mentorship/invalid-participants");
      }

      transaction.set(reference, {
        id: reference.id,
        studentId,
        mentorId: validation.data.mentorId,
        studentName: fullName(student.data()),
        mentorName: fullName(mentor.data()),
        message: validation.data.message,
        focusAreas: validation.data.focusAreas,
        status: "pending",
        chatId: null,
        respondedAt: null,
        completedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    return { success: true, data: { id: reference.id } };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "mentorship/invalid-participants"
    ) {
      return messageFailure("Öğrenci veya mentor profili uygun değil.");
    }
    return failure(error);
  }
}

export async function getStudentMentorships(
  studentId: string,
): Promise<MentorshipResult<Mentorship[]>> {
  if (auth.currentUser?.uid !== studentId) {
    return messageFailure("Mentorluklarını görüntüleme yetkin yok.");
  }
  try {
    const snapshots = await getDocs(
      query(collection(db, "mentorships"), where("studentId", "==", studentId)),
    );
    const items = snapshots.docs
      .map(parseMentorship)
      .filter((item): item is Mentorship => item !== null)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    return { success: true, data: items };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function respondToMentorshipRequest(
  mentorshipId: string,
  decision: "active" | "rejected",
): Promise<MentorshipResult<void>> {
  const mentorId = auth.currentUser?.uid;
  if (!mentorId) return messageFailure("Bu işlem için giriş yapmalısın.");

  try {
    await runTransaction(db, async (transaction) => {
      const mentorshipReference = doc(db, "mentorships", mentorshipId);
      const mentorReference = doc(db, "users", mentorId);
      const [mentorship, mentor] = await Promise.all([
        transaction.get(mentorshipReference),
        transaction.get(mentorReference),
      ]);
      if (
        !mentorship.exists() ||
        mentorship.data().mentorId !== mentorId ||
        mentorship.data().status !== "pending" ||
        !mentor.exists() ||
        mentor.data().role !== "mentor"
      ) {
        throw new Error("mentorship/not-pending");
      }

      const studentId: unknown = mentorship.data().studentId;
      const studentName: unknown = mentorship.data().studentName;
      if (typeof studentId !== "string" || !studentId) {
        throw new Error("mentorship/invalid-student");
      }

      const chatId =
        decision === "active" ? `mentorship__${mentorshipId}` : null;
      transaction.update(mentorshipReference, {
        status: decision,
        chatId,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (chatId) {
        transaction.set(doc(db, "chats", chatId), {
          id: chatId,
          supportRequestId: mentorshipId,
          mentorshipId,
          ideaId: mentorshipId,
          ideaTitle: `Mentorluk: ${
            typeof studentName === "string" ? studentName : "Öğrenci"
          }`,
          ownerId: studentId,
          supporterId: mentorId,
          participantIds: [studentId, mentorId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          lastMessageAt: null,
          unreadCounts: { [studentId]: 0, [mentorId]: 0 },
        });
      }
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "mentorship/not-pending") {
      return messageFailure("Bu talep artık yanıt beklemiyor.");
    }
    return failure(error);
  }
}

async function getNotes(mentorshipId: string): Promise<MentorNote[]> {
  const snapshots = await getDocs(
    query(
      collection(db, "mentorNotes"),
      where("mentorshipId", "==", mentorshipId),
      where("mentorId", "==", auth.currentUser?.uid ?? ""),
    ),
  );
  return snapshots.docs
    .flatMap((snapshot) => {
      const parsed = mentorNoteDocumentSchema.safeParse(snapshot.data());
      return parsed.success ? [parsed.data] : [];
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

async function getEvaluations(
  mentorshipId: string,
): Promise<MentorEvaluation[]> {
  const snapshots = await getDocs(
    query(
      collection(db, "mentorEvaluations"),
      where("mentorshipId", "==", mentorshipId),
      where("mentorId", "==", auth.currentUser?.uid ?? ""),
    ),
  );
  return snapshots.docs
    .flatMap((snapshot) => {
      const parsed = mentorEvaluationDocumentSchema.safeParse(snapshot.data());
      return parsed.success ? [parsed.data] : [];
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function getMentorDashboard(): Promise<
  MentorshipResult<MentorDashboardData>
> {
  const mentorId = auth.currentUser?.uid;
  if (!mentorId) return messageFailure("Mentor paneli için giriş yapmalısın.");

  try {
    const profile = await currentProfile();
    if (!profile || profile.data().role !== "mentor") {
      return messageFailure("Bu sayfa yalnızca mentor hesaplarına açıktır.");
    }
    const snapshots = await getDocs(
      query(collection(db, "mentorships"), where("mentorId", "==", mentorId)),
    );
    const mentorships = snapshots.docs
      .map(parseMentorship)
      .filter((item): item is Mentorship => item !== null);
    const activeMentorships = mentorships.filter(
      (item) => item.status === "active",
    );
    const ideasResult = await getPublicIdeas({});
    const active = await Promise.all(
      activeMentorships.map(async (mentorship) => {
        const [notes, evaluations] = await Promise.all([
          getNotes(mentorship.id),
          getEvaluations(mentorship.id),
        ]);
        const ideas = ideasResult.success
          ? ideasResult.data.filter(
              (idea) => idea.studentId === mentorship.studentId,
            )
          : [];
        return { ...mentorship, ideas, notes, evaluations };
      }),
    );
    return {
      success: true,
      data: {
        pending: mentorships.filter((item) => item.status === "pending"),
        active,
        completed: mentorships.filter((item) => item.status === "completed"),
        rejected: mentorships.filter(
          (item) => item.status === "rejected" || item.status === "cancelled",
        ).length,
      },
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function addMentorNote(
  mentorshipId: string,
  content: string,
): Promise<MentorshipResult<void>> {
  const validation = mentorNoteSchema.safeParse(content);
  if (!validation.success) {
    return messageFailure(
      validation.error.issues[0]?.message ?? "Not geçersiz.",
    );
  }
  const mentorId = auth.currentUser?.uid;
  if (!mentorId) return messageFailure("Not eklemek için giriş yapmalısın.");

  try {
    const mentorship = await getDoc(doc(db, "mentorships", mentorshipId));
    if (
      !mentorship.exists() ||
      mentorship.data().mentorId !== mentorId ||
      mentorship.data().status !== "active"
    ) {
      return messageFailure("Bu mentorluk için not ekleyemezsin.");
    }
    const reference = doc(collection(db, "mentorNotes"));
    await setDoc(reference, {
      id: reference.id,
      mentorshipId,
      mentorId,
      studentId: mentorship.data().studentId,
      content: validation.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function addMentorEvaluation(
  mentorshipId: string,
  input: MentorEvaluationInput,
): Promise<MentorshipResult<void>> {
  const validation = mentorEvaluationSchema.safeParse(input);
  if (!validation.success) {
    return messageFailure(
      validation.error.issues[0]?.message ?? "Değerlendirme geçersiz.",
    );
  }
  const mentorId = auth.currentUser?.uid;
  if (!mentorId) return messageFailure("Değerlendirme için giriş yapmalısın.");

  try {
    const mentorship = await getDoc(doc(db, "mentorships", mentorshipId));
    if (
      !mentorship.exists() ||
      mentorship.data().mentorId !== mentorId ||
      mentorship.data().status !== "active"
    ) {
      return messageFailure("Bu mentorluk için değerlendirme yapamazsın.");
    }
    const reference = doc(collection(db, "mentorEvaluations"));
    await setDoc(reference, {
      id: reference.id,
      mentorshipId,
      mentorId,
      studentId: mentorship.data().studentId,
      ...validation.data,
      createdAt: serverTimestamp(),
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function completeMentorship(
  mentorshipId: string,
): Promise<MentorshipResult<void>> {
  const mentorId = auth.currentUser?.uid;
  if (!mentorId) return messageFailure("Bu işlem için giriş yapmalısın.");
  try {
    const reference = doc(db, "mentorships", mentorshipId);
    const snapshot = await getDoc(reference);
    if (
      !snapshot.exists() ||
      snapshot.data().mentorId !== mentorId ||
      snapshot.data().status !== "active"
    ) {
      return messageFailure("Aktif mentorluk bulunamadı.");
    }
    await updateDoc(reference, {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAllMentorshipsForAdmin(): Promise<
  MentorshipResult<Mentorship[]>
> {
  const profile = await currentProfile();
  const role: unknown = profile?.data().role;
  if (!isUserRole(role) || !isAdminRole(role)) {
    return messageFailure("Yönetici yetkisi gerekli.");
  }
  try {
    const snapshots = await getDocs(collection(db, "mentorships"));
    const items = snapshots.docs
      .map(parseMentorship)
      .filter((item): item is Mentorship => item !== null)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    return { success: true, data: items };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateMentorshipByAdmin(
  mentorshipId: string,
  status: Extract<MentorshipStatus, "active" | "completed" | "cancelled">,
): Promise<MentorshipResult<void>> {
  const profile = await currentProfile();
  const role: unknown = profile?.data().role;
  if (!isUserRole(role) || !isAdminRole(role)) {
    return messageFailure("Yönetici yetkisi gerekli.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      const reference = doc(db, "mentorships", mentorshipId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("mentorship/not-found");

      if (status === "active" && snapshot.data().status === "pending") {
        const studentId: unknown = snapshot.data().studentId;
        const mentorId: unknown = snapshot.data().mentorId;
        const studentName: unknown = snapshot.data().studentName;
        if (typeof studentId !== "string" || typeof mentorId !== "string") {
          throw new Error("mentorship/invalid-participants");
        }
        const chatId = `mentorship__${mentorshipId}`;
        transaction.update(reference, {
          status: "active",
          chatId,
          respondedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(doc(db, "chats", chatId), {
          id: chatId,
          supportRequestId: mentorshipId,
          mentorshipId,
          ideaId: mentorshipId,
          ideaTitle: `Mentorluk: ${
            typeof studentName === "string" ? studentName : "Öğrenci"
          }`,
          ownerId: studentId,
          supporterId: mentorId,
          participantIds: [studentId, mentorId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: null,
          lastMessageAt: null,
          unreadCounts: { [studentId]: 0, [mentorId]: 0 },
        });
        return;
      }

      transaction.update(reference, {
        status,
        completedAt: status === "completed" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}
