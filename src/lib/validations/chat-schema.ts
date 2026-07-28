import { z } from "zod";

export const chatMessageContentSchema = z
  .string()
  .trim()
  .min(1, "Mesaj boş olamaz.")
  .max(2000, "Mesaj en fazla 2000 karakter olabilir.");
