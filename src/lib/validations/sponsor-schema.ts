import { z } from "zod";
import { safeText } from "./safe-text";

export const sponsorProfileInputSchema = z.object({
  institutionName: safeText().trim().min(2).max(120),
  logoUrl: z.union([z.url(), z.literal("")]).transform((value) => value || null),
  description: safeText().trim().min(20).max(1500),
  website: z.union([z.url(), z.literal("")]).transform((value) => value || null),
  city: z.string().trim().min(2).max(80),
  supportAreas: z.array(z.string().trim().min(2).max(60)).min(1).max(12),
});

export const sponsorSupportInputSchema = z.object({
  ideaId: z.string().min(1),
  message: safeText().trim().min(10).max(1000),
});

export type SponsorProfileInput = z.input<typeof sponsorProfileInputSchema>;
