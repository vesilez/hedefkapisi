import "client-only";

import { USER_ROLES } from "@/constants/roles";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { USER_STATUSES } from "@/constants/user-statuses";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import type { ProfileFormValues } from "@/lib/validations/profile-form-schema";
import {
  GUARDIAN_APPROVAL_STATUSES,
  MENTOR_PROFILE_STATUSES,
  SCHOOL_TYPES,
  SUPPORTER_TYPES,
  type UserWithProfiles,
} from "@/types/user";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { z } from "zod";

export type UserServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface SaveUserProfileInput extends ProfileFormValues {
  emailVerified: boolean;
  avatarUrl: string | null;
}

const firestoreTimestampSchema = z.unknown().transform((value, context) => {
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

const nullableTextSchema = z.string().nullable();
const userProfileDocumentSchema = z.object({
  id: z.string().min(1),
  role: z.enum(USER_ROLES),
  name: z.string(),
  surname: z.string(),
  email: z.string(),
  phone: nullableTextSchema,
  city: nullableTextSchema,
  status: z.enum(USER_STATUSES),
  profileCompleted: z.boolean(),
  emailVerified: z.boolean(),
  avatarUrl: nullableTextSchema,
  createdAt: firestoreTimestampSchema,
  updatedAt: firestoreTimestampSchema,
  studentProfile: z
    .object({
      userId: z.string(),
      schoolType: z.enum(SCHOOL_TYPES),
      schoolName: z.string(),
      department: nullableTextSchema,
      grade: nullableTextSchema,
      dateOfBirth: nullableTextSchema,
      guardianApprovalRequired: z.boolean(),
      guardianApprovalStatus: z.enum(GUARDIAN_APPROVAL_STATUSES),
      bio: nullableTextSchema,
    })
    .nullable(),
  supporterProfile: z
    .object({
      userId: z.string(),
      supporterType: z.enum(SUPPORTER_TYPES),
      organizationName: nullableTextSchema,
      title: nullableTextSchema,
      expertiseAreas: z.array(z.string()),
      supportTypes: z.array(z.enum(SUPPORT_TYPES)),
      bio: nullableTextSchema,
      website: nullableTextSchema,
      linkedin: nullableTextSchema,
      status: z.enum(USER_STATUSES),
    })
    .nullable(),
  mentorProfile: z
    .object({
      userId: z.string(),
      expertiseAreas: z.array(z.string()),
      bio: nullableTextSchema,
      company: nullableTextSchema,
      title: nullableTextSchema,
      linkedin: nullableTextSchema,
      website: nullableTextSchema,
      status: z.enum(MENTOR_PROFILE_STATUSES),
    })
    .nullable(),
});

function failure<T>(error: unknown): UserServiceResult<T> {
  return {
    success: false,
    error: {
      code: getFirebaseErrorCode(error) ?? "firestore/unknown",
      message: getFirebaseErrorMessage(error),
    },
  };
}

export async function getUserProfile(
  userId: string,
): Promise<UserServiceResult<UserWithProfiles | null>> {
  try {
    const snapshot = await getDoc(doc(db, "users", userId));
    if (!snapshot.exists()) return { success: true, data: null };

    const parsed = userProfileDocumentSchema.safeParse(snapshot.data());
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "firestore/invalid-user-profile",
          message:
            "Profil verileri okunamadı. Lütfen daha sonra tekrar deneyin.",
        },
      };
    }

    return { success: true, data: parsed.data };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function createOrUpdateUserProfile(
  userId: string,
  input: SaveUserProfileInput,
): Promise<UserServiceResult<void>> {
  const userReference = doc(db, "users", userId);

  try {
    const existing = await getDoc(userReference);
    const commonData = {
      id: userId,
      role: input.role,
      name: input.name,
      surname: input.surname,
      email: input.email,
      phone: input.phone || null,
      city: input.city,
      status: "active" as const,
      profileCompleted: true,
      emailVerified: input.emailVerified,
      avatarUrl: input.avatarUrl,
      updatedAt: serverTimestamp(),
    };

    const roleProfiles = {
      studentProfile:
        input.role === "student"
          ? {
              userId,
              schoolType: input.schoolType ?? "other",
              schoolName: input.schoolName ?? "",
              department: input.department || null,
              grade: input.grade || null,
              dateOfBirth: input.dateOfBirth || null,
              guardianApprovalRequired: input.guardianApprovalRequired ?? false,
              guardianApprovalStatus: input.guardianApprovalRequired
                ? ("pending" as const)
                : ("not_required" as const),
              bio: input.bio || null,
            }
          : null,
      supporterProfile:
        input.role === "supporter"
          ? {
              userId,
              supporterType: input.supporterType ?? "other",
              organizationName: input.organizationName || null,
              title: input.title || null,
              expertiseAreas: input.expertiseAreas,
              supportTypes: input.supportTypes,
              bio: input.bio || null,
              website: input.website || null,
              linkedin: input.linkedin || null,
              status: "active" as const,
            }
          : null,
      mentorProfile:
        input.role === "mentor"
          ? {
              userId,
              expertiseAreas: input.expertiseAreas,
              bio: input.bio || null,
              company: input.company || null,
              title: input.title || null,
              linkedin: input.linkedin || null,
              website: input.website || null,
              status: "pending" as const,
            }
          : null,
    };

    await setDoc(
      userReference,
      {
        ...commonData,
        ...roleProfiles,
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function isUserProfileCompleted(
  userId: string,
): Promise<UserServiceResult<boolean>> {
  const result = await getUserProfile(userId);
  if (!result.success) return result;

  return { success: true, data: result.data?.profileCompleted ?? false };
}
