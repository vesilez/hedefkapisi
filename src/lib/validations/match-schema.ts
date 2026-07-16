import { MATCH_TYPES } from "@/types/match";
import { z } from "zod";
import { entityIdSchema } from "./common-schema";

const optionalEntityIdSchema = entityIdSchema.nullable().optional();

export const createMatchSchema = z
  .object({
    ideaId: entityIdSchema,
    studentId: entityIdSchema,
    supporterId: optionalEntityIdSchema,
    mentorId: optionalEntityIdSchema,
    matchType: z.enum(MATCH_TYPES, {
      error: "Geçerli bir eşleştirme türü seçin.",
    }),
    supportRequestId: optionalEntityIdSchema,
    adminNote: z
      .string()
      .trim()
      .max(2000, "Yönetici notu en fazla 2000 karakter olabilir.")
      .nullable()
      .optional(),
  })
  .refine((data) => Boolean(data.supporterId || data.mentorId), {
    message: "Destekçi veya mentor alanlarından en az biri doldurulmalıdır.",
    path: ["supporterId"],
  })
  .refine(
    (data) =>
      !data.supporterId || !data.mentorId || data.supporterId !== data.mentorId,
    {
      message: "Aynı kişi hem destekçi hem mentor olarak seçilemez.",
      path: ["mentorId"],
    },
  );

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
