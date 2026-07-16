import { z } from "zod";
import { registerSchema } from "./auth-schema";

export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, "Şifre tekrarı boş bırakılamaz."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
