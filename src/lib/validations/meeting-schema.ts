import { z } from "zod";
import { safeText } from "./safe-text";
import { MEETING_TYPES } from "@/types/meeting";

export const HTML_DATETIME_LOCAL_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/;

const localDateTime = z
  .string()
  .regex(
    HTML_DATETIME_LOCAL_PATTERN,
    "Tarih ve saat YYYY-MM-DDTHH:mm biçiminde olmalıdır.",
  )
  .refine((value) => !Number.isNaN(Date.parse(`${value}:00+03:00`)), {
    message: "Geçerli bir tarih ve saat seçin.",
  });

export const meetingSchema = z
  .object({
    conversationId: z.string().trim().min(1),
    title: safeText().trim().min(3, "Başlık en az 3 karakter olmalıdır.").max(120),
    description: safeText().trim().max(1000).optional().default(""),
    startAt: localDateTime,
    endAt: localDateTime,
    location: safeText().trim().max(200).optional().default(""),
    meetingType: z.enum(MEETING_TYPES).default("online"),
  })
  .refine((value) => value.endAt > value.startAt, {
    message: "Bitiş zamanı başlangıçtan sonra olmalıdır.",
    path: ["endAt"],
  });

export type MeetingFormValues = z.infer<typeof meetingSchema>;
