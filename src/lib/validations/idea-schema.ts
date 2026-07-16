import { IDEA_STAGES } from "@/constants/idea-stages";
import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_MVP_ENABLED,
} from "@/constants/support-types";
import { IDEA_VISIBILITIES } from "@/types/idea";
import { z } from "zod";
import { citySchema, entityIdSchema, urlSchema } from "./common-schema";

const uniqueValues = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const ideaFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Başlık en az 5 karakter olmalıdır.")
    .max(100, "Başlık en fazla 100 karakter olabilir."),
  shortDescription: z
    .string()
    .trim()
    .min(20, "Kısa açıklama en az 20 karakter olmalıdır.")
    .max(240, "Kısa açıklama en fazla 240 karakter olabilir."),
  description: z
    .string()
    .trim()
    .min(50, "Açıklama en az 50 karakter olmalıdır.")
    .max(5000, "Açıklama en fazla 5000 karakter olabilir."),
  problem: z
    .string()
    .trim()
    .min(20, "Problem açıklaması en az 20 karakter olmalıdır.")
    .max(2000, "Problem açıklaması en fazla 2000 karakter olabilir."),
  solution: z
    .string()
    .trim()
    .min(20, "Çözüm açıklaması en az 20 karakter olmalıdır.")
    .max(2000, "Çözüm açıklaması en fazla 2000 karakter olabilir."),
  targetAudience: z
    .string()
    .trim()
    .min(5, "Hedef kitle en az 5 karakter olmalıdır.")
    .max(500, "Hedef kitle en fazla 500 karakter olabilir."),
  categoryId: entityIdSchema,
  city: citySchema,
  stage: z.enum(IDEA_STAGES, {
    error: "Geçerli bir fikir aşaması seçin.",
  }),
  supportNeeds: z
    .array(z.enum(SUPPORT_TYPES))
    .min(1, "En az bir destek ihtiyacı seçin.")
    .max(6, "En fazla 6 destek ihtiyacı seçebilirsiniz.")
    .refine(uniqueValues, "Destek ihtiyaçları tekrar eden değer içeremez.")
    .refine(
      (values) => values.every((value) => SUPPORT_TYPE_MVP_ENABLED[value]),
      "Finansal destek MVP sürümünde kullanılamaz.",
    ),
  visibility: z.enum(IDEA_VISIBILITIES, {
    error: "Geçerli bir görünürlük seçin.",
  }),
  coverImageUrl: urlSchema,
  attachmentUrls: z
    .array(z.url("Ek dosya adresi geçerli bir URL olmalıdır."))
    .max(5, "En fazla 5 ek dosya adresi ekleyebilirsiniz.")
    .refine(uniqueValues, "Ek dosya adresleri tekrar eden değer içeremez."),
  prototypeUrl: urlSchema,
  githubUrl: urlSchema,
  websiteUrl: urlSchema,
});

export type IdeaFormInput = z.infer<typeof ideaFormSchema>;
