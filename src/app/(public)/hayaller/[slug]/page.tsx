import { IdeaDetail } from "@/components/ideas";
import { getPublicIdeaBySlug } from "@/services/public-idea-service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicIdeaBySlug(slug);

  if (!result.success || !result.data) {
    return createPageMetadata({
      title: "Hayal Bulunamadı",
      description: "Aradığınız hayal bulunamadı veya yayında değil.",
      path: `/hayaller/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: result.data.title,
    description: result.data.shortDescription,
    path: `/hayaller/${slug}`,
  });
}

export default async function IdeaDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicIdeaBySlug(slug);

  if (!result.success) {
    throw new Error("Fikir detayı şu anda yüklenemiyor.");
  }
  if (!result.data) notFound();

  return <IdeaDetail idea={result.data} />;
}
