import { IdeaEdit } from "@/components/ideas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fikri Düzenle | Hedef Kapısı" },
  description: "Paylaştığın fikri güncelle ve yeniden değerlendirmeye gönder.",
};

export default async function EditIdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IdeaEdit ideaId={id} />;
}
