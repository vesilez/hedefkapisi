import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Sıkça Sorulan Sorular",
  description:
    "Hedef Kapısı hakkında öğrenciler, mentorlar, destekçiler ve kurumlar için sık sorulan soruların yanıtları.",
  path: "/sss",
});

export default function FaqPage() {
  return (
    <PlaceholderPage
      title="Sıkça Sorulan Sorular"
      description="Öğrenciler, mentorlar, destekçiler ve kurumlar için sık sorulan sorular burada yanıtlanacak."
    />
  );
}
