import { PageContainer } from "@/components/layout/page-container";
import { SponsorDetail } from "@/components/sponsor";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sponsor Profili",
  description: "Onaylı sponsor kurumun profilini ve destek alanlarını inceleyin.",
  path: "/sponsorlar",
});

export default async function SponsorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageContainer className="py-10 sm:py-16"><SponsorDetail sponsorId={id} /></PageContainer>;
}
