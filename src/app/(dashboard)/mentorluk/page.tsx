import { PageContainer } from "@/components/layout/page-container";
import { MentorDashboard } from "@/components/mentorship";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mentor Paneli",
  description: "Mentorluk taleplerini ve aktif öğrencilerini yönet.",
  path: "/mentorluk",
  noIndex: true,
});

export default function MentorshipPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">
          Mentor Paneli
        </h1>
        <p className="mt-3 text-slate-600">
          Taleplerini, öğrencilerini, notlarını ve ilerleme değerlendirmelerini
          yönet.
        </p>
      </header>
      <MentorDashboard />
    </PageContainer>
  );
}
