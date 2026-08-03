import { SUPPORT_TYPE_LABELS, SUPPORT_TYPES, type SupportType } from "@/constants/support-types";
import type { IdeaListItem } from "@/types/idea";
import type { IdeaMatch } from "@/types/matching";

export const normalizeMatchText = (value: unknown) =>
  typeof value === "string"
    ? value.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    : "";

export const matchTerms = (values: unknown[]) =>
  new Set(values.flatMap((value) => normalizeMatchText(value).split(" ")).filter((value) => value.length > 2));

export function inferSupportTypes(values: unknown[]): SupportType[] {
  const text = normalizeMatchText(values.join(" "));
  return SUPPORT_TYPES.filter((type) =>
    [normalizeMatchText(type), normalizeMatchText(SUPPORT_TYPE_LABELS[type])].some((term) => text.includes(term)),
  );
}

export function scoreIdeaMatch(
  idea: IdeaListItem,
  profileTerms: Set<string>,
  preferredSupport: SupportType[],
  city: string,
): IdeaMatch {
  const ideaTerms = matchTerms([idea.title, idea.shortDescription, idea.categoryId, ...idea.supportNeeds]);
  const overlap = [...profileTerms].filter((term) => ideaTerms.has(term));
  const supportOverlap = idea.supportNeeds.filter((type) => preferredSupport.includes(type));
  const categoryMatch = [...profileTerms].some((term) => normalizeMatchText(idea.categoryId).includes(term));
  const cityMatch = Boolean(city && idea.city && normalizeMatchText(city) === normalizeMatchText(idea.city));
  const score = Math.min(100, (categoryMatch ? 25 : 0) + Math.min(30, supportOverlap.length * 15) + (cityMatch ? 15 : 0) + Math.min(20, overlap.length * 5) + (overlap.length ? 10 : 0));
  const reasons = [
    ...(categoryMatch ? ["Kategori ilgi alanınızla eşleşiyor"] : []),
    ...(supportOverlap.length ? [`${supportOverlap.map((type) => SUPPORT_TYPE_LABELS[type]).join(", ")} desteği aranıyor`] : []),
    ...(cityMatch ? ["Aynı şehirde"] : []),
    ...(overlap.length ? [`Ortak alanlar: ${overlap.slice(0, 4).join(", ")}`] : []),
  ];
  return { idea, score, reasons: reasons.length ? reasons : ["Profilinize yakın yeni bir hayal"] };
}
