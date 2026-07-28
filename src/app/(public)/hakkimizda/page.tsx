import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Hakkımızda",
  description:
    "Hedef Kapısı'nın amacı, ilkeleri ve gençlerle birlikte kurmak istediği gelecek hakkında bilgi edinin.",
  path: "/hakkimizda",
});

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="Hakkımızda"
      description="Hedef Kapısı'nın amacı, ilkeleri ve gençlerle birlikte kurmak istediği gelecek burada anlatılacak."
    />
  );
}
