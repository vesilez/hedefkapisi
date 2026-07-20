import type { UserRole } from "@/constants/roles";
import type { SupportType } from "@/constants/support-types";
import type { UserStatus } from "@/constants/user-statuses";
import type { EntityId, ISODateString, Nullable } from "./common";

export const SCHOOL_TYPES = [
  "high_school",
  "university",
  "graduate",
  "other",
] as const;
export type SchoolType = (typeof SCHOOL_TYPES)[number];

export const GUARDIAN_APPROVAL_STATUSES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const;
export type GuardianApprovalStatus =
  (typeof GUARDIAN_APPROVAL_STATUSES)[number];

export const SUPPORTER_TYPES = [
  "individual",
  "company",
  "ngo",
  "public_institution",
  "university",
  "other",
] as const;
export type SupporterType = (typeof SUPPORTER_TYPES)[number];

export const MENTOR_PROFILE_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type MentorProfileStatus = (typeof MENTOR_PROFILE_STATUSES)[number];

export interface BaseUser {
  id: EntityId;
  role: UserRole;
  name: string;
  surname: string;
  email: string;
  phone: Nullable<string>;
  city: Nullable<string>;
  status: UserStatus;
  profileCompleted: boolean;
  emailVerified: boolean;
  avatarUrl: Nullable<string>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateUserDocumentInput {
  uid: EntityId;
  role: "student" | "supporter" | "mentor";
  name: string;
  surname: string;
  email: string;
  emailVerified: boolean;
}

export interface UpdateUserProfileInput {
  role: "student" | "supporter" | "mentor";
  name: string;
  surname: string;
  email: string;
  phone?: string;
  city: string;
  emailVerified: boolean;
  avatarUrl: Nullable<string>;
}

export interface StudentProfile {
  userId: EntityId;
  schoolType: SchoolType;
  schoolName: string;
  department: Nullable<string>;
  grade: Nullable<string>;
  dateOfBirth: Nullable<ISODateString>;
  guardianApprovalRequired: boolean;
  guardianApprovalStatus: GuardianApprovalStatus;
  bio: Nullable<string>;
}

export interface SupporterProfile {
  userId: EntityId;
  supporterType: SupporterType;
  organizationName: Nullable<string>;
  title: Nullable<string>;
  expertiseAreas: string[];
  supportTypes: SupportType[];
  bio: Nullable<string>;
  website: Nullable<string>;
  linkedin: Nullable<string>;
  status: UserStatus;
}

export interface MentorProfile {
  userId: EntityId;
  expertiseAreas: string[];
  bio: Nullable<string>;
  company: Nullable<string>;
  title: Nullable<string>;
  linkedin: Nullable<string>;
  website: Nullable<string>;
  status: MentorProfileStatus;
}

export interface UserWithProfiles extends BaseUser {
  studentProfile: Nullable<StudentProfile>;
  supporterProfile: Nullable<SupporterProfile>;
  mentorProfile: Nullable<MentorProfile>;
}

export interface PublicStudentSummary {
  id: EntityId;
  name: string;
  surname: string;
  city: Nullable<string>;
  avatarUrl: Nullable<string>;
  schoolType: SchoolType;
  schoolName: string;
  department: Nullable<string>;
  bio: Nullable<string>;
}

export type User = BaseUser;
