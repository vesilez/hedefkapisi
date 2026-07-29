import { z } from "zod";
import { FEEDBACK_TYPES } from "@/types/feedback";
import { safeText } from "./safe-text";

export const feedbackInputSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  title: safeText()
    .trim()
    .min(5, "Başlık en az 5 karakter olmalıdır.")
    .max(120, "Başlık en fazla 120 karakter olabilir."),
  description: safeText()
    .trim()
    .min(15, "Açıklama en az 15 karakter olmalıdır.")
    .max(3000, "Açıklama en fazla 3000 karakter olabilir."),
  pagePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
      message: "İlgili sayfa geçerli bir uygulama yolu olmalıdır.",
    }),
});

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
