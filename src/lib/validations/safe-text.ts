import { z } from "zod";

const DANGEROUS_HTML_PATTERN =
  /<\s*\/?\s*(?:script|iframe|object|embed|style|link|meta|svg|math|form)\b|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/iu;

export function containsDangerousHtml(value: string): boolean {
  return DANGEROUS_HTML_PATTERN.test(value);
}

export function safeText(message = "HTML veya çalıştırılabilir içerik kullanılamaz.") {
  return z.string().refine((value) => !containsDangerousHtml(value), message);
}
