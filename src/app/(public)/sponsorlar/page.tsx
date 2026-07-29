import { PageContainer } from "@/components/layout/page-container";
import { SponsorDirectory } from "@/components/sponsor";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sponsorlar",
  description: "Hedef Kapısı'nda hayallere resmî destek veren onaylı kurumları keşfedin.",
  path: "/sponsorlar",
});

export default function SponsorsPage() {
  return <PageContainer className="py-10 sm:py-16">
    <header className="mb-8 max-w-3xl"><h1 className="text-3xl font-black text-slate-950 sm:text-5xl">Sponsor Kurumlar</h1>
      <p className="mt-4 leading-7 text-slate-600">Gençlerin hayallerine kaynak, uzmanlık ve iş birliği sağlayan onaylı kurumlar.</p></header>
    <SponsorDirectory />
  </PageContainer>;
}
