import { FeedbackForm } from "@/components/feedback";
import { PageContainer } from "@/components/layout/page-container";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Geri Bildirim",
  description: "Hedef Kapısı pilot deneyiminizle ilgili hata, öneri veya memnuniyet geri bildirimi gönderin.",
  path: "/geri-bildirim",
  noIndex: true,
});

export default function FeedbackPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <header className="mx-auto mb-8 max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Pilot programı</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-5xl">Geri bildiriminiz platformu şekillendiriyor</h1>
        <p className="mt-4 leading-7 text-slate-600">Karşılaştığınız sorunları ve geliştirme önerilerinizi doğrudan pilot ekibine iletin.</p>
      </header>
      <FeedbackForm />
    </PageContainer>
  );
}
