import { IDEA_STAGES } from "@/constants/idea-stages";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { db } from "@/lib/firebase/firestore";
import type { PublicIdeaDetail } from "@/types/idea";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { z } from "zod";

export type PublicIdeaResult =
  | { success: true; data: PublicIdeaDetail | null }
  | { success: false; error: { message: string } };

const timestampSchema = z.unknown().transform((value, context) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const publicIdeaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  problem: z.string(),
  solution: z.string(),
  targetAudience: z.string(),
  categoryId: z.string(),
  city: z.string().nullable(),
  stage: z.enum(IDEA_STAGES),
  supportNeeds: z.array(z.enum(SUPPORT_TYPES)),
  visibility: z.enum(["public", "anonymous"]),
  isFeatured: z.boolean(),
  supportCount: z.number(),
  prototypeUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  publishedAt: z.union([timestampSchema, z.null()]),
  createdAt: timestampSchema,
});

export async function getPublicIdeaBySlug(
  slug: string,
): Promise<PublicIdeaResult> {
  const normalizedSlug = slug.trim();
  if (process.env.NODE_ENV === "development") {
    console.info("[public-idea] route param:", normalizedSlug);
    console.info("[public-idea] query type: slug");
  }
  if (!normalizedSlug) return { success: true, data: null };

  try {
    const snapshots = await getDocs(
      query(
        collection(db, "ideas"),
        where("slug", "==", normalizedSlug),
        where("status", "==", "approved"),
        limit(1),
      ),
    );
    const snapshot = snapshots.docs[0];
    if (process.env.NODE_ENV === "development") {
      console.info("[public-idea] document found:", Boolean(snapshot));
      console.info("[public-idea] status:", snapshot?.data().status ?? null);
      console.info(
        "[public-idea] visibility:",
        snapshot?.data().visibility ?? null,
      );
    }
    if (
      !snapshot ||
      snapshot.data().status !== "approved" ||
      snapshot.data().visibility === "private"
    ) {
      return { success: true, data: null };
    }

    const parsed = publicIdeaSchema.safeParse(snapshot.data());
    if (!parsed.success) {
      return { success: true, data: null };
    }

    return { success: true, data: parsed.data };
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.error("[public-idea] Fikir detayı okunamadı.");
    }
    return {
      success: false,
      error: { message: "Fikir detayı şu anda yüklenemiyor." },
    };
  }
}
