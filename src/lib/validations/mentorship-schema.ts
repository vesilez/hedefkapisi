import { z } from "zod";

export const mentorshipRequestSchema = z.object({
  mentorId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(20, "Talep mesajı en az 20 karakter olmalıdır.")
    .max(1500, "Talep mesajı en fazla 1500 karakter olabilir."),
  focusAreas: z
    .array(z.string().trim().min(1))
    .min(1, "En az bir odak alanı seçmelisiniz.")
    .max(5, "En fazla 5 odak alanı seçebilirsiniz.")
    .refine(
      (values) => new Set(values).size === values.length,
      "Odak alanları tekrar edemez.",
    ),
});

export const mentorNoteSchema = z
  .string()
  .trim()
  .min(3, "Not en az 3 karakter olmalıdır.")
  .max(3000, "Not en fazla 3000 karakter olabilir.");

export const mentorEvaluationSchema = z.object({
  progress: z.number().int().min(1).max(5),
  summary: z
    .string()
    .trim()
    .min(10, "Değerlendirme en az 10 karakter olmalıdır.")
    .max(2000, "Değerlendirme en fazla 2000 karakter olabilir."),
  nextSteps: z
    .string()
    .trim()
    .min(5, "Sonraki adımlar en az 5 karakter olmalıdır.")
    .max(1500, "Sonraki adımlar en fazla 1500 karakter olabilir."),
});

export type MentorshipRequestInput = z.infer<typeof mentorshipRequestSchema>;
export type MentorEvaluationInput = z.infer<typeof mentorEvaluationSchema>;
