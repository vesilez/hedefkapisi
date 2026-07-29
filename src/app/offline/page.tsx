import { PageContainer } from "@/components/layout/page-container";
import { createPageMetadata } from "@/lib/seo";
import { CloudOff, Home, RotateCcw } from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata({
  title: "Çevrimdışı",
  description: "Hedef Kapısı çevrimdışı bilgilendirme sayfası.",
  path: "/offline",
  noIndex: true,
});

export default function OfflinePage() {
  return (
    <PageContainer className="grid min-h-[70vh] place-items-center py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-950/5 sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-700">
          <CloudOff aria-hidden="true" className="size-8" />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-widest text-blue-700">
          Çevrimdışısınız
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Bağlantınızı kontrol edin
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Bu sayfa için internet bağlantısı gerekiyor. Bağlantınız geri
          geldiğinde yeniden deneyebilir veya ana sayfaya dönebilirsiniz.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/offline"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Yeniden dene
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-800 hover:bg-blue-50"
          >
            <Home aria-hidden="true" className="size-4" />
            Ana sayfa
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
