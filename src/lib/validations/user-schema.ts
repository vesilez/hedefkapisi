import { SUPPORT_TYPES } from "@/constants/support-types";
import { USER_STATUSES } from "@/constants/user-statuses";
import {
  MENTOR_AVAILABILITY_OPTIONS,
  MENTOR_EXPERTISE_AREAS,
  MENTORING_TOPICS,
} from "@/constants/mentor-profile";
import {
  GUARDIAN_APPROVAL_STATUSES,
  SCHOOL_TYPES,
  SUPPORTER_TYPES,
} from "@/types/user";
import { z } from "zod";
import {
  citySchema,
  emailSchema,
  entityIdSchema,
  isoDateStringSchema,
  phoneSchema,
  urlSchema,
} from "./common-schema";

const optionalLimitedText = (maximum: number, message: string) =>
  z.string().trim().max(maximum, message).nullable().optional();

const uniqueValues = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const baseUserProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ad en az 2 karakter olmalıdır.")
    .max(50, "Ad en fazla 50 karakter olabilir."),
  surname: z
    .string()
    .trim()
    .min(2, "Soyad en az 2 karakter olmalıdır.")
    .max(50, "Soyad en fazla 50 karakter olabilir."),
  email: emailSchema,
  phone: phoneSchema,
  city: citySchema,
  avatarUrl: urlSchema,
});

export const studentProfileSchema = z.object({
  userId: entityIdSchema,
  schoolType: z.enum(SCHOOL_TYPES, {
    error: "Geçerli bir okul türü seçin.",
  }),
  schoolName: z
    .string()
    .trim()
    .min(2, "Okul adı en az 2 karakter olmalıdır.")
    .max(150, "Okul adı en fazla 150 karakter olabilir."),
  department: optionalLimitedText(150, "Bölüm en fazla 150 karakter olabilir."),
  grade: optionalLimitedText(50, "Sınıf en fazla 50 karakter olabilir."),
  dateOfBirth: z
    .union([isoDateStringSchema, z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  guardianApprovalRequired: z.boolean(),
  guardianApprovalStatus: z.enum(GUARDIAN_APPROVAL_STATUSES, {
    error: "Geçerli bir veli onay durumu seçin.",
  }),
  bio: optionalLimitedText(1000, "Biyografi en fazla 1000 karakter olabilir."),
});

export const supporterProfileSchema = z.object({
  userId: entityIdSchema,
  supporterType: z.enum(SUPPORTER_TYPES, {
    error: "Geçerli bir destekçi türü seçin.",
  }),
  organizationName: optionalLimitedText(
    200,
    "Kurum adı en fazla 200 karakter olabilir.",
  ),
  title: optionalLimitedText(120, "Unvan en fazla 120 karakter olabilir."),
  expertiseAreas: z
    .array(z.string().trim().min(1, "Uzmanlık alanı boş olamaz."))
    .refine(uniqueValues, "Uzmanlık alanları tekrar eden değer içeremez."),
  supportTypes: z
    .array(z.enum(SUPPORT_TYPES))
    .refine(uniqueValues, "Destek türleri tekrar eden değer içeremez."),
  bio: optionalLimitedText(1000, "Biyografi en fazla 1000 karakter olabilir."),
  website: urlSchema,
  linkedin: urlSchema,
  status: z.enum(USER_STATUSES, {
    error: "Geçerli bir kullanıcı durumu seçin.",
  }),
});

export const mentorProfileSchema = z.object({
  profession: z
    .string()
    .trim()
    .min(1, "Meslek alanı zorunludur.")
    .max(120, "Meslek en fazla 120 karakter olabilir."),
  organization: z
    .string()
    .trim()
    .max(200, "Çalışılan kurum en fazla 200 karakter olabilir."),
  expertiseAreas: z
    .array(z.enum(MENTOR_EXPERTISE_AREAS))
    .min(1, "En az bir uzmanlık alanı seçin.")
    .refine(uniqueValues, "Uzmanlık alanları tekrar eden değer içeremez."),
  experienceYears: z.coerce
    .number<number>()
    .int("Deneyim yılı tam sayı olmalıdır.")
    .min(0, "Deneyim yılı 0'dan küçük olamaz.")
    .max(60, "Deneyim yılı 60'tan büyük olamaz."),
  biography: z
    .string()
    .trim()
    .min(30, "Biyografi en az 30 karakter olmalıdır.")
    .max(1000, "Biyografi en fazla 1000 karakter olabilir."),
  mentoringTopics: z
    .array(z.enum(MENTORING_TOPICS))
    .min(1, "En az bir mentorluk konusu seçin.")
    .refine(uniqueValues, "Mentorluk konuları tekrar eden değer içeremez."),
  availability: z.enum(MENTOR_AVAILABILITY_OPTIONS, {
    error: "Geçerli bir uygunluk durumu seçin.",
  }),
  linkedinUrl: urlSchema,
  websiteUrl: urlSchema,
});

export type BaseUserProfileInput = z.infer<typeof baseUserProfileSchema>;
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
export type SupporterProfileInput = z.infer<typeof supporterProfileSchema>;
export type MentorProfileInput = z.infer<typeof mentorProfileSchema>;
