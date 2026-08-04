import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { SUPPORT_TYPE_LABELS, SUPPORT_TYPES, type SupportType } from "@/constants/support-types";
import type { IdeaListItem } from "@/types/idea";
import type { IdeaMatch } from "@/types/matching";

export const MATCH_SCORE_WEIGHTS = {
  category: 20,
  supportType: 25,
  city: 10,
  tags: 15,
  interests: 15,
  expertise: 15,
} as const;

export const normalizeMatchText = (value: unknown) =>
  typeof value === "string" ? value.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, " ").trim() : "";

export const matchTerms = (values: unknown[]) =>
  new Set(values.flatMap((value) => normalizeMatchText(value).split(" ")).filter((value) => value.length > 2));

export function inferSupportTypes(values: unknown[]): SupportType[] {
  const text = normalizeMatchText(values.join(" "));
  return SUPPORT_TYPES.filter((type) => [normalizeMatchText(type), normalizeMatchText(SUPPORT_TYPE_LABELS[type])].some((term) => text.includes(term)));
}

function overlap(first: Set<string>, second: Set<string>): string[] {
  return [...first].filter((term) => second.has(term));
}

export function scoreIdeaMatch(
  idea: IdeaListItem,
  interestTerms: Set<string>,
  preferredSupport: SupportType[],
  city: string,
  expertiseTerms: Set<string> = interestTerms,
): IdeaMatch {
  const category = DEFAULT_CATEGORIES.find((item) => item.id === idea.categoryId);
  const categoryTerms = matchTerms([idea.categoryId, category?.label]);
  const tagTerms = matchTerms([idea.title, idea.shortDescription, ...(idea.tags ?? [])]);
  const ideaTerms = new Set([...categoryTerms, ...tagTerms, ...matchTerms(idea.supportNeeds.map((type) => SUPPORT_TYPE_LABELS[type]))]);
  const categoryOverlap = overlap(new Set([...interestTerms, ...expertiseTerms]), categoryTerms);
  const supportOverlap = idea.supportNeeds.filter((type) => preferredSupport.includes(type));
  const tagOverlap = overlap(new Set([...interestTerms, ...expertiseTerms]), tagTerms);
  const interestOverlap = overlap(interestTerms, ideaTerms);
  const expertiseOverlap = overlap(expertiseTerms, ideaTerms);
  const cityMatch = Boolean(city && idea.city && normalizeMatchText(city) === normalizeMatchText(idea.city));
  const score = Math.min(100,
    (categoryOverlap.length ? MATCH_SCORE_WEIGHTS.category : 0) +
    Math.round(MATCH_SCORE_WEIGHTS.supportType * Math.min(1, supportOverlap.length / Math.max(1, preferredSupport.length))) +
    (cityMatch ? MATCH_SCORE_WEIGHTS.city : 0) +
    Math.min(MATCH_SCORE_WEIGHTS.tags, tagOverlap.length * 5) +
    Math.min(MATCH_SCORE_WEIGHTS.interests, interestOverlap.length * 5) +
    Math.min(MATCH_SCORE_WEIGHTS.expertise, expertiseOverlap.length * 5),
  );
  const reasons = [
    ...(categoryOverlap.length ? [`${category?.label ?? idea.categoryId} kategorisi profilinizle eşleşiyor`] : []),
    ...(supportOverlap.length ? [`Aranan destekler: ${supportOverlap.map((type) => SUPPORT_TYPE_LABELS[type]).join(", ")}`] : []),
    ...(cityMatch ? ["Aynı şehirde"] : []),
    ...(tagOverlap.length ? [`Eşleşen etiketler: ${tagOverlap.slice(0, 4).join(", ")}`] : []),
    ...(interestOverlap.length ? [`İlgi alanlarınızla uyumlu: ${interestOverlap.slice(0, 4).join(", ")}`] : []),
    ...(expertiseOverlap.length ? [`Uzmanlığınızla uyumlu: ${expertiseOverlap.slice(0, 4).join(", ")}`] : []),
  ];
  return { idea, score, reasons: reasons.length ? reasons : ["Profilinize yakın yeni bir hayal"] };
}
