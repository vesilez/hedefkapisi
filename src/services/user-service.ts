import "client-only";

import {
  isAdminRole,
  isUserRole,
  USER_ROLES,
  type UserRole,
} from "@/constants/roles";
import { SUPPORT_TYPES } from "@/constants/support-types";
import {
  USER_STATUSES,
  type UserStatus,
} from "@/constants/user-statuses";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import type { ProfileFormValues } from "@/lib/validations/profile-form-schema";
import { isPublicRegisterRole } from "@/lib/validations/auth-schema";
import {
  mentorProfileSchema,
  supporterProfileSchema,
} from "@/lib/validations/user-schema";
import {
  GUARDIAN_APPROVAL_STATUSES,
  SCHOOL_TYPES,
  SUPPORTER_TYPES,
  type UserWithProfiles,
  type BaseUser,
  type CreateUserDocumentInput,
  type UpdateUserProfileInput,
} from "@/types/user";
import {
  type DocumentData,
  type DocumentSnapshot,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocFromServer,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";

type UserServiceFailure = {
  success: false;
  error: { code: string; message: string };
};

export type UserServiceResult<T> = { success: true; data: T } | UserServiceFailure;

export type SaveUserProfileInput = ProfileFormValues &
  Pick<
    UpdateUserProfileInput,
    "emailVerified" | "avatarUrl" | "supporterProfile" | "mentorProfile"
  >;

export interface UserAccessProfile {
  id: string;
  role: UserRole;
}

export type AdminUserListItem = Pick<
  BaseUser,
  "id" | "name" | "surname" | "email" | "role" | "status" | "createdAt"
>;

export interface AdminUserStatistics {
  total: number;
  students: number;
  supporters: number;
  mentors: number;
}

export type UserAccessProfileListener = (
  result: UserServiceResult<UserAccessProfile | null>,
) => void;

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
const mentorProfileDocumentSchema = z
  .union([
    z.object({
      profession: z.string(),
      organization: z.string(),
      expertiseAreas: z.array(z.string()),
      experienceYears: z.number(),
      biography: z.string(),
      mentoringTopics: z.array(z.string()),
      availability: z.string(),
      linkedinUrl: nullableTextSchema.optional(),
      websiteUrl: nullableTextSchema.optional(),
    }),
    z.object({
      expertiseAreas: z.array(z.string()),
      bio: nullableTextSchema,
      company: nullableTextSchema,
      title: nullableTextSchema,
      linkedin: nullableTextSchema,
      website: nullableTextSchema,
    }),
  ])
  .transform((profile) =>
    "profession" in profile
      ? profile
      : {
          profession: profile.title ?? "",
          organization: profile.company ?? "",
          expertiseAreas: profile.expertiseAreas,
          experienceYears: 0,
          biography: profile.bio ?? "",
          mentoringTopics: profile.expertiseAreas,
          availability: "Hafta içi",
          linkedinUrl: profile.linkedin,
          websiteUrl: profile.website,
        },
  );
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
    .nullable()
    .optional()
    .default(null),
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
    .nullable()
    .optional()
    .default(null),
  mentorProfile: mentorProfileDocumentSchema
    .nullable()
    .optional()
    .default(null),
});

const adminUserListDocumentSchema = z.object({
  id: z.string().min(1),
  role: z.enum(USER_ROLES),
  name: z.string(),
  surname: z.string(),
  email: z.string(),
  status: z.preprocess(
    (value) => (value === "approved" ? "active" : value),
    z.enum(USER_STATUSES),
  ),
  createdAt: firestoreTimestampSchema,
});

function failure(error: unknown): UserServiceFailure {
  return {
    success: false,
    error: {
      code: getFirebaseErrorCode(error) ?? "firestore/unknown",
      message: getFirebaseErrorMessage(error),
    },
  };
}

function logAccessSnapshot(
  userId: string,
  snapshot: DocumentSnapshot<DocumentData>,
): void {
  if (process.env.NODE_ENV !== "development") return;

  const role: unknown = snapshot.exists() ? snapshot.data().role : undefined;
  console.info("[admin-access] auth uid present:", userId.length > 0);
  console.info("[admin-access] profile document found:", snapshot.exists());
  console.info(
    "[admin-access] profile role:",
    typeof role === "string" ? role : "invalid",
  );
}

function mapUserAccessSnapshot(
  snapshot: DocumentSnapshot<DocumentData>,
): UserServiceResult<UserAccessProfile | null> {
  if (!snapshot.exists()) return { success: true, data: null };

  const rawRole: unknown = snapshot.data().role;
  const role: unknown =
    typeof rawRole === "string" ? rawRole.trim().toLowerCase() : rawRole;
  if (!isUserRole(role)) {
    return {
      success: false,
      error: {
        code: "firestore/invalid-user-role",
        message: "Profil rolü okunamadı. Lütfen daha sonra tekrar deneyin.",
      },
    };
  }

  return { success: true, data: { id: snapshot.id, role } };
}

async function ensureAdminUser(
  adminId: string,
): Promise<UserServiceResult<void>> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return {
      success: false,
      error: {
        code: "user/unauthorized",
        message: "Bu işlem için yetkiniz yok.",
      },
    };
  }

  try {
    const profile = await getDoc(doc(db, "users", adminId));
    const role: unknown = profile.exists() ? profile.data().role : null;
    if (!isAdminRole(role)) {
      return {
        success: false,
        error: {
          code: "user/unauthorized",
          message: "Bu işlem için yetkiniz yok.",
        },
      };
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAdminUsers(
  adminId: string,
): Promise<UserServiceResult<AdminUserListItem[]>> {
  const authorization = await ensureAdminUser(adminId);
  if (!authorization.success) return authorization;

  try {
    const snapshots = await getDocsFromServer(collection(db, "users"));
    const users: AdminUserListItem[] = [];

    for (const snapshot of snapshots.docs) {
      const data: unknown = snapshot.data();
      const parsed = adminUserListDocumentSchema.safeParse({
        ...(typeof data === "object" && data !== null ? data : {}),
        id: snapshot.id,
      });
      if (!parsed.success) {
        console.error("[user-service:getAdminUsers] invalid user document", {
          documentId: snapshot.id,
          role: snapshot.data().role,
          status: snapshot.data().status,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        });
        return {
          success: false,
          error: {
            code: "firestore/invalid-user-profile",
            message: "Kullanıcı verileri okunamadı.",
          },
        };
      }

      const { id, name, surname, email, role, status, createdAt } = parsed.data;
      users.push({ id, name, surname, email, role, status, createdAt });
    }

    users.sort((firstUser, secondUser) =>
      secondUser.createdAt.localeCompare(firstUser.createdAt),
    );
    return { success: true, data: users };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function getAdminUserStatistics(
  adminId: string,
): Promise<UserServiceResult<AdminUserStatistics>> {
  const authorization = await ensureAdminUser(adminId);
  if (!authorization.success) return authorization;

  try {
    const users = collection(db, "users");
    const [total, students, supporters, mentors] = await Promise.all([
      getCountFromServer(users),
      getCountFromServer(query(users, where("role", "==", "student"))),
      getCountFromServer(query(users, where("role", "==", "supporter"))),
      getCountFromServer(query(users, where("role", "==", "mentor"))),
    ]);

    return {
      success: true,
      data: {
        total: total.data().count,
        students: students.data().count,
        supporters: supporters.data().count,
        mentors: mentors.data().count,
      },
    };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateUserRoleAsAdmin(
  adminId: string,
  userId: string,
  role: UserRole,
): Promise<UserServiceResult<void>> {
  if (adminId === userId) {
    return {
      success: false,
      error: {
        code: "user/self-role-change-not-allowed",
        message: "Kendi rolünüzü değiştiremezsiniz.",
      },
    };
  }
  if (!isUserRole(role)) {
    return {
      success: false,
      error: { code: "user/invalid-role", message: "Geçersiz kullanıcı rolü." },
    };
  }

  const authorization = await ensureAdminUser(adminId);
  if (!authorization.success) return authorization;

  try {
    const reference = doc(db, "users", userId);
    const target = await getDocFromServer(reference);
    if (!target.exists()) {
      return {
        success: false,
        error: {
          code: "user/not-found",
          message: "Kullanıcı bulunamadı.",
        },
      };
    }

    await setDoc(
      reference,
      { role, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateUserStatusAsAdmin(
  adminId: string,
  userId: string,
  status: Extract<UserStatus, "active" | "suspended">,
): Promise<UserServiceResult<void>> {
  if (adminId === userId) {
    return {
      success: false,
      error: {
        code: "user/self-suspension-not-allowed",
        message: "Kendi hesabınızın durumunu değiştiremezsiniz.",
      },
    };
  }
  if (status !== "active" && status !== "suspended") {
    return {
      success: false,
      error: {
        code: "user/invalid-status",
        message: "Geçersiz kullanıcı durumu.",
      },
    };
  }

  const authorization = await ensureAdminUser(adminId);
  if (!authorization.success) return authorization;

  try {
    const reference = doc(db, "users", userId);
    const target = await getDocFromServer(reference);
    if (!target.exists()) {
      return {
        success: false,
        error: {
          code: "user/not-found",
          message: "Kullanıcı bulunamadı.",
        },
      };
    }

    await setDoc(
      reference,
      { status, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function createUserDocument(
  input: CreateUserDocumentInput,
): Promise<UserServiceResult<void>> {
  if (!isPublicRegisterRole(input.role)) {
    return {
      success: false,
      error: {
        code: "user/invalid-role",
        message: "Bu kullanıcı rolüyle herkese açık kayıt yapılamaz.",
      },
    };
  }

  try {
    await setDoc(
      doc(db, "users", input.uid),
      {
        id: input.uid,
        role: input.role,
        name: input.name,
        surname: input.surname,
        email: input.email,
        phone: "",
        city: "",
        status: "active",
        profileCompleted: false,
        emailVerified: input.emailVerified,
        avatarUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false },
    );

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
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

export async function getUserAccessProfile(
  userId: string,
): Promise<UserServiceResult<UserAccessProfile | null>> {
  try {
    const snapshot = await getDoc(doc(db, "users", userId));
    logAccessSnapshot(userId, snapshot);
    return mapUserAccessSnapshot(snapshot);
  } catch (error: unknown) {
    const result = failure(error);
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[admin-access] profile load error:",
        result.error.code,
        result.error.message,
      );
    }
    return result;
  }
}

export function subscribeToUserAccessProfile(
  userId: string,
  listener: UserAccessProfileListener,
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", userId),
    { includeMetadataChanges: true },
    (snapshot) => {
      // Yetki kararında kalıcı/yerel cache yerine Firestore sunucu verisini kullan.
      if (snapshot.metadata.fromCache) return;
      logAccessSnapshot(userId, snapshot);
      listener(mapUserAccessSnapshot(snapshot));
    },
    (error: unknown) => {
      const result = failure(error);
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[admin-access] profile load error:",
          result.error.code,
          result.error.message,
        );
      }
      listener(result);
    },
  );
}

export async function updateUserProfile(
  userId: string,
  input: SaveUserProfileInput,
): Promise<UserServiceResult<void>> {
  const userReference = doc(db, "users", userId);

  try {
    const existing = await getDoc(userReference);
    if (!existing.exists()) {
      return {
        success: false,
        error: {
          code: "firestore/user-profile-not-found",
          message:
            "Profil kaydınız bulunamadı. Lütfen daha sonra tekrar deneyin.",
        },
      };
    }

    const existingRole = existing.data().role;
    if (!isPublicRegisterRole(existingRole) || existingRole !== input.role) {
      return {
        success: false,
        error: {
          code: "user/role-change-not-allowed",
          message: "Kullanıcı rolü profil sayfasından değiştirilemez.",
        },
      };
    }

    const supporterProfile =
      existingRole === "supporter"
        ? supporterProfileSchema.safeParse({
            userId,
            supporterType: input.supporterProfile?.supporterType,
            organizationName:
              input.supporterProfile?.organizationName || null,
            title: input.supporterProfile?.title || null,
            expertiseAreas: input.supporterProfile?.expertiseAreas,
            supportTypes: input.supporterProfile?.supportTypes,
            bio: input.supporterProfile?.bio || null,
            website: input.supporterProfile?.website || null,
            linkedin: input.supporterProfile?.linkedin || null,
            status: "active",
          })
        : null;

    if (supporterProfile && !supporterProfile.success) {
      return {
        success: false,
        error: {
          code: "user/invalid-supporter-profile",
          message:
            supporterProfile.error.issues[0]?.message ??
            "Destekçi profil bilgileri geçersiz.",
        },
      };
    }

    const mentorProfile =
      existingRole === "mentor"
        ? mentorProfileSchema.safeParse(input.mentorProfile)
        : null;
    if (mentorProfile && !mentorProfile.success) {
      return {
        success: false,
        error: {
          code: "user/invalid-mentor-profile",
          message:
            mentorProfile.error.issues[0]?.message ??
            "Mentor profil bilgileri geçersiz.",
        },
      };
    }

    const commonData = {
      id: userId,
      role: existingRole,
      name: input.name,
      surname: input.surname,
      email: input.email,
      phone: input.phone || null,
      city: input.city,
      status: "active" as const,
      // Destekçi profilinde nested veri sunucudan doğrulanana kadar false kalır.
      profileCompleted: existingRole === "supporter" ? false : true,
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
          ? supporterProfile?.data
          : null,
      mentorProfile:
        input.role === "mentor"
          ? mentorProfile?.success
            ? {
                profession: mentorProfile.data.profession,
                organization: mentorProfile.data.organization,
                expertiseAreas: mentorProfile.data.expertiseAreas,
                experienceYears: mentorProfile.data.experienceYears,
                biography: mentorProfile.data.biography,
                mentoringTopics: mentorProfile.data.mentoringTopics,
                availability: mentorProfile.data.availability,
                linkedinUrl: mentorProfile.data.linkedinUrl || null,
                websiteUrl: mentorProfile.data.websiteUrl || null,
              }
            : null
          : null,
    };

    await setDoc(
      userReference,
      {
        ...commonData,
        ...roleProfiles,
      },
      { merge: true },
    );

    const savedProfile = await getDocFromServer(userReference);
    if (
      !savedProfile.exists() ||
      (existingRole === "supporter" &&
        savedProfile.data().supporterProfile == null)
    ) {
      return {
        success: false,
        error: {
          code: "firestore/profile-write-not-confirmed",
          message:
            "Profil bilgileri kaydedilemedi. Lütfen tekrar deneyin.",
        },
      };
    }

    if (existingRole === "supporter") {
      await setDoc(
        userReference,
        {
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const completedProfile = await getDocFromServer(userReference);
      if (
        !completedProfile.exists() ||
        completedProfile.data().profileCompleted !== true ||
        completedProfile.data().supporterProfile == null
      ) {
        return {
          success: false,
          error: {
            code: "firestore/profile-completion-not-confirmed",
            message:
              "Destekçi profili tamamlanamadı. Lütfen tekrar deneyin.",
          },
        };
      }
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
  }
}

export const createOrUpdateUserProfile = updateUserProfile;

export async function isUserProfileCompleted(
  userId: string,
): Promise<UserServiceResult<boolean>> {
  const result = await getUserProfile(userId);
  if (!result.success) return result;

  return { success: true, data: result.data?.profileCompleted ?? false };
}
