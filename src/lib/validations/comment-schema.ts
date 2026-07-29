import { z } from "zod";
import { safeText } from "./safe-text";

export const commentContentSchema = safeText()
  .trim()
  .min(2, "Yorum en az 2 karakter olmalıdır.")
  .max(1000, "Yorum en fazla 1000 karakter olabilir.");

export type CommentContentInput = z.input<typeof commentContentSchema>;
