import { DEFAULT_CATEGORY_IDS } from "@/constants/default-categories";
import { isSupportType, type SupportType } from "@/constants/support-types";
import type { IdeaListItem } from "@/types/idea";

export const PUBLIC_IDEA_SORTS = [
  "newest",
  "oldest",
  "most_liked",
  "most_commented",
] as const;

export type PublicIdeaSort = (typeof PUBLIC_IDEA_SORTS)[number];

export interface IdeaFilterValues {
  search: string;
  categoryId: string;
  city: string;
  supportType: SupportType | "";
  sort: PublicIdeaSort;
}

export const EMPTY_IDEA_FILTERS: IdeaFilterValues = {
  search: "",
  categoryId: "",
  city: "",
  supportType: "",
  sort: "newest",
};

function isPublicIdeaSort(value: string): value is PublicIdeaSort {
  return PUBLIC_IDEA_SORTS.some((option) => option === value);
}

function firstString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeIdeaFilters(
  values: Readonly<Record<string, unknown>>,
): IdeaFilterValues {
  const categoryId = firstString(values.kategori);
  const supportType = firstString(values.destek);
  const sort = firstString(values.siralama);

  return {
    search: firstString(values.q),
    categoryId: DEFAULT_CATEGORY_IDS.some((id) => id === categoryId)
      ? categoryId
      : "",
    city: firstString(values.sehir),
    supportType: isSupportType(supportType) ? supportType : "",
    sort: isPublicIdeaSort(sort) ? sort : "newest",
  };
}

export function filterAndSortIdeas(
  ideas: readonly IdeaListItem[],
  filters: IdeaFilterValues,
): IdeaListItem[] {
  const search = filters.search.trim().toLocaleLowerCase("tr-TR");
  const city = filters.city.trim().toLocaleLowerCase("tr-TR");
  const filtered = ideas.filter((idea) => {
    const matchesSearch =
      !search ||
      idea.title.toLocaleLowerCase("tr-TR").includes(search) ||
      idea.shortDescription.toLocaleLowerCase("tr-TR").includes(search);
    const matchesCategory =
      !filters.categoryId || idea.categoryId === filters.categoryId;
    const matchesCity =
      !city || idea.city?.toLocaleLowerCase("tr-TR").includes(city);
    const matchesSupport =
      !filters.supportType ||
      idea.supportNeeds.includes(filters.supportType);

    return (
      matchesSearch && matchesCategory && matchesCity && matchesSupport
    );
  });

  return filtered.sort((first, second) => {
    if (filters.sort === "oldest") {
      return first.createdAt.localeCompare(second.createdAt);
    }
    if (filters.sort === "most_liked") {
      return (
        second.likeCount - first.likeCount ||
        second.createdAt.localeCompare(first.createdAt)
      );
    }
    if (filters.sort === "most_commented") {
      return (
        second.commentCount - first.commentCount ||
        second.createdAt.localeCompare(first.createdAt)
      );
    }
    return second.createdAt.localeCompare(first.createdAt);
  });
}

export function ideaFiltersToQuery(filters: IdeaFilterValues): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.categoryId) params.set("kategori", filters.categoryId);
  if (filters.city.trim()) params.set("sehir", filters.city.trim());
  if (filters.supportType) params.set("destek", filters.supportType);
  if (filters.sort !== "newest") params.set("siralama", filters.sort);
  return params.toString();
}
