import type { UserRole } from "@/constants/roles";
import { z } from "zod";
import { emailSchema } from "./common-schema";
import { safeText } from "./safe-text";
import { ORGANIZATION_TYPES } from "@/types/sponsor";

export const registrationSponsorProfileSchema = z.object({
  organizationName: safeText().trim().min(2).max(120),
  organizationType: z.enum(ORGANIZATION_TYPES),
  city: safeText().trim().min(2).max(80),
  website: z
    .union([z.url("Geçerli bir web sitesi adresi girin."), z.literal("")])
    .transform((value) => value || null),
  description: safeText().trim().min(20).max(1500),
  supportAreas: z
    .array(safeText().trim().min(2).max(60))
    .min(1, "En az bir destek alanı girin.")
    .max(12),
});

export const PUBLIC_REGISTER_ROLES = [
  "student",
  "supporter",
  "mentor",
  "sponsor",
] as const satisfies readonly UserRole[];

export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

export function isPublicRegisterRole(
  role: UserRole,
): role is PublicRegisterRole {
  return PUBLIC_REGISTER_ROLES.some((publicRole) => publicRole === role);
}

export const registerFieldsSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/\p{L}/u, "Şifre en az bir harf içermelidir.")
    .regex(/\d/, "Şifre en az bir rakam içermelidir."),
  name: safeText()
    .trim()
    .min(2, "Ad en az 2 karakter olmalıdır.")
    .max(50, "Ad en fazla 50 karakter olabilir."),
  surname: safeText()
    .trim()
    .min(2, "Soyad en az 2 karakter olmalıdır.")
    .max(50, "Soyad en fazla 50 karakter olabilir."),
  role: z.enum(PUBLIC_REGISTER_ROLES, {
    error: "Kayıt için geçerli bir kullanıcı rolü seçin.",
  }),
  sponsorProfile: registrationSponsorProfileSchema.optional(),
});

export function validateRegistrationRole(
  values: z.infer<typeof registerFieldsSchema>,
  context: z.RefinementCtx,
) {
  if (values.role === "sponsor" && !values.sponsorProfile) {
    context.addIssue({
      code: "custom",
      path: ["sponsorProfile"],
      message: "Sponsor/kurum bilgileri zorunludur.",
    });
  }
  if (values.role !== "sponsor" && values.sponsorProfile) {
    context.addIssue({
      code: "custom",
      path: ["sponsorProfile"],
      message: "Sponsor bilgileri yalnızca sponsor rolünde kullanılabilir.",
    });
  }
}

export const registerSchema = registerFieldsSchema.superRefine(
  validateRegistrationRole,
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifre boş bırakılamaz."),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const profileRepairSchema = z
  .object({
    name: safeText().trim().min(2).max(50),
    surname: safeText().trim().min(2).max(50),
    role: z.enum(PUBLIC_REGISTER_ROLES),
    sponsorProfile: registrationSponsorProfileSchema.optional(),
  })
  .superRefine((values, context) =>
    validateRegistrationRole(
      { ...values, email: "repair@example.com", password: "repair123" },
      context,
    ),
  );

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
