import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_MVP_ENABLED,
} from "@/constants/support-types";
import { z } from "zod";
import { entityIdSchema } from "./common-schema";

const uniqueValues = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const createSupportRequestSchema = z.object({
  ideaId: entityIdSchema,
  supportTypes: z
    .array(z.enum(SUPPORT_TYPES))
    .min(1, "En az bir destek türü seçin.")
    .max(4, "En fazla 4 destek türü seçebilirsiniz.")
    .refine(uniqueValues, "Destek türleri tekrar eden değer içeremez.")
    .refine(
      (values) =>
        values.every(
          (value) => value !== "financial" && SUPPORT_TYPE_MVP_ENABLED[value],
        ),
      "Finansal destek MVP sürümünde kullanılamaz.",
    ),
  message: z
    .string()
    .trim()
    .min(20, "Mesaj en az 20 karakter olmalıdır.")
    .max(1500, "Mesaj en fazla 1500 karakter olabilir."),
});

export type CreateSupportRequestSchemaInput = z.infer<
  typeof createSupportRequestSchema
>;
