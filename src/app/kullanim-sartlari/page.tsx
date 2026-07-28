import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Kullanım Şartları",
  description:
    "Hedef Kapısı platformunun kullanımına ilişkin haklar, sorumluluklar ve kurallar.",
  path: "/kullanim-sartlari",
});

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Kullanım Şartları"
      description="Platform kullanımına ilişkin haklar, sorumluluklar ve kurallar burada açıklanacak."
    />
  );
}
