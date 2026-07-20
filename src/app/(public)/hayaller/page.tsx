import { IdeaList } from "@/components/ideas";
import { PageContainer } from "@/components/layout/page-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Hayaller | Hedef Kapısı" },
  description: "Öğrencilerin paylaştığı hayalleri ve fikirleri keşfet.",
};

export default function IdeasPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Hayalleri Keşfet
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Gençlerin fikirlerini incele, ilham al ve destek olabileceğin
          projeleri keşfet.
        </p>
      </div>
      <IdeaList />
    </PageContainer>
  );
}
