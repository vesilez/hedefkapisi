import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "KVKK Aydınlatma Metni",
  description:
    "Hedef Kapısı'nın 6698 sayılı KVKK kapsamındaki kişisel veri işleme aydınlatma metni.",
  path: "/kvkk",
});

export default function KvkkPage() {
  return (
    <PlaceholderPage
      title="KVKK Aydınlatma Metni"
      description="6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki aydınlatma metni burada sunulacak."
    />
  );
}
