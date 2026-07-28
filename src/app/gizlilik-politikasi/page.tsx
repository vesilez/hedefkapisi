import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Gizlilik Politikası",
  description: "Hedef Kapısı kişisel verileri işleme ve koruma ilkeleri.",
  path: "/gizlilik-politikasi",
});

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Gizlilik Politikası"
      description="Platformun kişisel verileri nasıl işlediğine dair ayrıntılı gizlilik metni burada yayımlanacak."
    />
  );
}
