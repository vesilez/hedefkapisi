import { expect, test } from "@playwright/test";
import { matchTerms, scoreIdeaMatch } from "../src/lib/matching/score-idea-match";
import type { IdeaListItem } from "../src/types/idea";

const idea: IdeaListItem = {
  id: "idea-1",
  studentId: "student-1",
  slug: "robotik-egitim",
  title: "Robotik eğitim atölyesi",
  shortDescription: "Öğrenciler için yazılım ve ekipman desteği arıyoruz.",
  categoryId: "education",
  city: "İstanbul",
  stage: "support_needed",
  supportNeeds: ["software", "equipment", "mentorship"],
  visibility: "public",
  isFeatured: false,
  supportCount: 0,
  likeCount: 0,
  commentCount: 0,
  coverImageUrl: null,
  createdAt: "2026-08-03T00:00:00.000Z",
};

test.describe("akıllı eşleştirme skoru", () => {
  test("sponsor profilini kategori, destek ve şehirle eşleştirir", () => {
    const result = scoreIdeaMatch(
      idea,
      matchTerms(["education", "yazılım", "ekipman"]),
      ["software", "equipment"],
      "İstanbul",
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain("Aynı şehirde");
  });

  test("mentor uzmanlığı ve mentorluk ihtiyacını eşleştirir", () => {
    const result = scoreIdeaMatch(
      idea,
      matchTerms(["robotik", "eğitim"]),
      ["mentorship"],
      "Ankara",
    );

    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.reasons.some((reason) => reason.includes("Mentorluk"))).toBeTruthy();
  });

  test("destekçi destek türleri ve ilgileriyle eşleştirir", () => {
    const result = scoreIdeaMatch(
      idea,
      matchTerms(["öğrenci", "yazılım"]),
      ["software"],
      "İzmir",
    );

    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.reasons.some((reason) => reason.includes("Yazılım"))).toBeTruthy();
  });
});
