import type { UserRole } from "@/constants/roles";
import { z } from "zod";
import { emailSchema } from "./common-schema";

export const PUBLIC_REGISTER_ROLES = [
  "student",
  "supporter",
  "mentor",
] as const satisfies readonly UserRole[];

export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

export function isPublicRegisterRole(
  role: UserRole,
): role is PublicRegisterRole {
  return PUBLIC_REGISTER_ROLES.some((publicRole) => publicRole === role);
}

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/\p{L}/u, "Şifre en az bir harf içermelidir.")
    .regex(/\d/, "Şifre en az bir rakam içermelidir."),
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
  role: z.enum(PUBLIC_REGISTER_ROLES, {
    error: "Kayıt için geçerli bir kullanıcı rolü seçin.",
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifre boş bırakılamaz."),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
