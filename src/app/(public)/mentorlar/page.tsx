import { MentorDirectory } from "@/components/mentorship";
import { PageContainer } from "@/components/layout/page-container";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mentorlar",
  description:
    "Hedeflerine uygun uzmanlık alanlarına sahip mentorları keşfet ve mentorluk talebi gönder.",
  path: "/mentorlar",
});

export default function MentorsPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-black text-slate-950 sm:text-5xl">
          Mentorunu Bul
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Deneyimli mentorların uzmanlıklarını incele, hedeflerine en uygun
          kişiyi seç ve mentorluk talebini gönder.
        </p>
      </header>
      <MentorDirectory />
    </PageContainer>
  );
}
