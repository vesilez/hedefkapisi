import { IdeaDetail } from "@/components/ideas";
import { getPublicIdeaBySlug } from "@/services/public-idea-service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicIdeaBySlug(slug);

  if (!result.success || !result.data) {
    return {
      title: "Hayal Bulunamadı",
      description: "Aradığınız hayal bulunamadı veya yayında değil.",
    };
  }

  return {
    title: { absolute: `${result.data.title} | Hedef Kapısı` },
    description: result.data.shortDescription,
  };
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
