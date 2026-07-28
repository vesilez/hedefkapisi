import { PageContainer } from "@/components/layout/page-container";
import { IdeaForm } from "@/components/ideas";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Hayalini Paylaş",
  description:
    "Hayalini veya fikrini paylaş, ihtiyaç duyduğun desteği belirt ve doğru kişilerle buluş.",
  path: "/hayalini-paylas",
  noIndex: true,
});

export default function ShareIdeaPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Hayalini Paylaş
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Hayalini anlaşılır bir fikre dönüştür ve ihtiyaç duyduğun desteği
          belirt.
        </p>
      </div>
      <IdeaForm />
    </PageContainer>
  );
}
