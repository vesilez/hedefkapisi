import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden bg-gradient-to-b from-blue-50 to-slate-50 py-16 sm:py-24">
        <PageContainer>
          <Badge>Hayal et. Paylaş. Birlikte gerçekleştir.</Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Gençlerin fikirleri doğru destekle geleceğe dönüşür.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Hedef Kapısı; öğrencileri, mentorları, destekçileri ve kurumları
            güvenli bir zeminde buluşturmak için hazırlanıyor.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/hayaller"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Hayalleri Keşfet{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/hayalini-paylas"
              className="inline-flex min-h-12 items-center rounded-xl border border-blue-200 bg-white px-6 py-3 font-semibold text-blue-800 hover:bg-blue-50"
            >
              Hayalini Paylaş
            </Link>
          </div>
        </PageContainer>
      </section>
      <section className="py-14 sm:py-20">
        <PageContainer>
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <Lightbulb aria-hidden="true" className="size-7 text-blue-700" />
              <h2 className="mt-4 text-lg font-bold">Fikrini görünür kıl</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hayalini ve çözüm önerini anlaşılır bir yapıyla paylaş.
              </p>
            </Card>
            <Card>
              <HeartHandshake
                aria-hidden="true"
                className="size-7 text-blue-700"
              />
              <h2 className="mt-4 text-lg font-bold">Doğru destekle buluş</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mentor ve kurumların kontrollü destek başvurularını değerlendir.
              </p>
            </Card>
            <Card>
              <ShieldCheck
                aria-hidden="true"
                className="size-7 text-blue-700"
              />
              <h2 className="mt-4 text-lg font-bold">Güvenli ilerle</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Şeffaf süreçler ve açık rollerle fikrini güvenle geliştir.
              </p>
            </Card>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
