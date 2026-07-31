import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_MVP_ENABLED,
} from "@/constants/support-types";
import { z } from "zod";
import { entityIdSchema } from "./common-schema";
import { safeText } from "./safe-text";
import {
  CONTACT_PREFERENCES,
  SUPPORT_APPLICATION_TYPES,
} from "@/types/support-request";

const uniqueValues = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const createSupportRequestSchema = z.object({
  ideaId: entityIdSchema,
  applicationType: z.enum(SUPPORT_APPLICATION_TYPES),
  supportTypes: z
    .array(z.enum(SUPPORT_TYPES))
    .min(1, "En az bir destek türü seçin.")
    .max(4, "En fazla 4 destek türü seçebilirsiniz.")
    .refine(uniqueValues, "Destek türleri tekrar eden değer içeremez.")
    .refine(
      (values) =>
        values.every((value) =>
          value === "financial" ? true : SUPPORT_TYPE_MVP_ENABLED[value],
        ),
      "Geçersiz destek türü.",
    ),
  message: safeText()
    .trim()
    .min(20, "Mesaj en az 20 karakter olmalıdır.")
    .max(1500, "Mesaj en fazla 1500 karakter olabilir."),
  contactPreference: z.enum(CONTACT_PREFERENCES),
  contributionDetails: safeText()
    .trim()
    .max(1000, "Bütçe veya katkı açıklaması en fazla 1000 karakter olabilir.")
    .nullable(),
});

export type CreateSupportRequestSchemaInput = z.infer<
  typeof createSupportRequestSchema
>;
