import { PageContainer } from "@/components/layout/page-container";
import { SponsorPanel } from "@/components/sponsor";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sponsor / Kurum Dashboard",
  description:
    "Sponsorluk tekliflerinizi, önerilen hayalleri ve destek istatistiklerinizi yönetin.",
  path: "/sponsor/dashboard",
  noIndex: true,
});

export default function SponsorDashboardPage() {
  return (
    <PageContainer className="py-8 sm:py-12">
      <SponsorPanel />
    </PageContainer>
  );
}
