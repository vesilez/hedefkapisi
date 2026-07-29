import { z } from "zod";
import {
  registerFieldsSchema,
  validateRegistrationRole,
} from "./auth-schema";

export const registerFormSchema = registerFieldsSchema
  .extend({
    confirmPassword: z.string().min(1, "Şifre tekrarı boş bırakılamaz."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  })
  .superRefine(validateRegistrationRole);

export type RegisterFormInput = z.input<typeof registerFormSchema>;
export type RegisterFormValues = z.output<typeof registerFormSchema>;
