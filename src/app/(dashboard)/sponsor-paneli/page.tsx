import { PageContainer } from "@/components/layout/page-container";
import { SponsorPanel } from "@/components/sponsor";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sponsor Paneli",
  description: "Sponsor başvurunuzu, hayal keşfini ve resmî destek geçmişinizi yönetin.",
  path: "/sponsor-paneli",
  noIndex: true,
});

export default function SponsorPanelPage() {
  return <PageContainer className="py-10 sm:py-14"><SponsorPanel /></PageContainer>;
}
