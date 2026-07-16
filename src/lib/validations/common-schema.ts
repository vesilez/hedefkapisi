import { z } from "zod";

export const entityIdSchema = z
  .string()
  .trim()
  .min(1, "Kimlik alanı boş bırakılamaz.");

export const emailSchema = z
  .string()
  .trim()
  .email("Geçerli bir e-posta adresi girin.");

export const phoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[+\d][\d\s()-]*$/.test(value),
    "Geçerli bir telefon numarası girin.",
  )
  .refine((value) => {
    if (value === "") return true;
    const digitCount = value.replace(/\D/g, "").length;
    return digitCount >= 10 && digitCount <= 15;
  }, "Telefon numarası 10 ile 15 rakam arasında olmalıdır.")
  .nullable()
  .optional();

export const urlSchema = z
  .union([z.url("Geçerli bir URL girin."), z.literal("")])
  .nullable()
  .optional();

export const isoDateStringSchema = z.union(
  [
    z.iso.date("Geçerli bir ISO tarihi girin."),
    z.iso.datetime({
      offset: true,
      error: "Geçerli bir ISO tarihi girin.",
    }),
  ],
  { error: "Geçerli bir ISO tarihi girin." },
);

export const citySchema = z
  .string()
  .trim()
  .min(2, "Şehir en az 2 karakter olmalıdır.")
  .max(100, "Şehir en fazla 100 karakter olabilir.");

export const requiredShortTextSchema = z
  .string()
  .trim()
  .min(1, "Bu alan boş bırakılamaz.")
  .max(255, "Bu alan en fazla 255 karakter olabilir.");

export const optionalTextSchema = z
  .string()
  .trim()
  .max(2000, "Bu alan en fazla 2000 karakter olabilir.")
  .nullable()
  .optional();

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int("Sayfa numarası tam sayı olmalıdır.")
    .min(1, "Sayfa numarası en az 1 olmalıdır.")
    .default(1),
  pageSize: z.coerce
    .number()
    .int("Sayfa boyutu tam sayı olmalıdır.")
    .min(1, "Sayfa boyutu en az 1 olmalıdır.")
    .max(100, "Sayfa boyutu en fazla 100 olabilir.")
    .default(20),
});

export type PaginationInput = z.input<typeof paginationSchema>;
export type PaginationValues = z.output<typeof paginationSchema>;
