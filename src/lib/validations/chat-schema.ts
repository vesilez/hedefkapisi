import { safeText } from "./safe-text";

export const chatMessageContentSchema = safeText()
  .trim()
  .min(1, "Mesaj boş olamaz.")
  .max(2000, "Mesaj en fazla 2000 karakter olabilir.");
