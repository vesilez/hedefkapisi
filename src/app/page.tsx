import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Gençlerin Hayallerini Gerçeğe Dönüştüren Platform",
  description:
    "Hayalini paylaş, mentorlar ve destekçilerle buluş; fikrini güvenli adımlarla geleceğe taşı.",
  path: "/",
});

export default function HomePage() {
  const steps = [
    {
      icon: Lightbulb,
      number: "01",
      title: "Hayalini anlat",
      description:
        "Fikrini, çözmek istediğin problemi ve ihtiyaç duyduğun desteği paylaş.",
    },
    {
      icon: UsersRound,
      number: "02",
      title: "Doğru kişilerle buluş",
      description:
        "Mentorlar, destekçiler ve kurumlarla güvenli bir zeminde bağlantı kur.",
    },
    {
      icon: Sparkles,
      number: "03",
      title: "Birlikte geliştir",
      description:
        "Geri bildirim ve doğru kaynaklarla hayalini uygulanabilir hale getir.",
    },
  ] as const;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-slate-50 py-12 sm:py-18 lg:py-24">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-80 rounded-full bg-blue-200 opacity-50 blur-3xl sm:size-112"
        />
        <PageContainer className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <Badge className="border border-blue-200 bg-white px-3 py-1.5 text-blue-800 shadow-sm">
              Hayal et. Paylaş. Birlikte gerçekleştir.
            </Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Gençlerin fikirleri,
              <span className="block text-blue-700">geleceğin projeleri.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Hedef Kapısı; öğrencileri, mentorları, destekçileri ve kurumları
              güvenli bir zeminde buluşturur. Hayalini görünür kıl, doğru
              destekle büyüt.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Link
                href="/hayalini-paylas"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-blue-700/20 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl focus-visible:outline-blue-700"
              >
                Hayalini Paylaş
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/hayaller"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-blue-200 bg-white px-6 py-3 text-center font-semibold text-blue-800 shadow-sm hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md focus-visible:outline-blue-700"
              >
                Hayalleri Keşfet
              </Link>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
              {["Güvenli süreç", "Şeffaf roller", "Doğru destek"].map(
                (item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-emerald-700"
                    />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <Card className="relative overflow-hidden border-blue-100 bg-white shadow-xl shadow-blue-900/10 sm:p-7">
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 size-28 rounded-bl-full bg-blue-50"
            />
            <span className="relative inline-flex size-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
              <HeartHandshake aria-hidden="true" className="size-6" />
            </span>
            <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Bir fikrin varsa
            </p>
            <h2 className="relative mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              İlk adımı atmak için mükemmel olmak zorunda değilsin.
            </h2>
            <p className="relative mt-4 leading-7 text-slate-600">
              Fikrini anlaşılır bir yapıyla paylaş. İhtiyacını belirt, sana
              katkı sunabilecek insanlarla buluş.
            </p>
            <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xl font-black text-blue-700">3 adım</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Kolay paylaşım süreci
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-2xl font-black text-blue-700">Tek çatı</p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  Öğrenci ve destekçiler
                </p>
              </div>
            </div>
          </Card>
        </PageContainer>
      </section>

      <section className="py-14 sm:py-20">
        <PageContainer>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              Nasıl çalışır?
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Hayalden harekete, sade bir yol
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Fikrini tek başına taşımak zorunda değilsin. Hedef Kapısı her
              adımda doğru bağlantıyı kurmana yardımcı olur.
            </p>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map(({ icon: Icon, number, title, description }) => (
              <li key={number}>
                <Card className="group h-full hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-sm font-black text-slate-300">
                      {number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </Card>
              </li>
            ))}
          </ol>

          <div className="mt-12 overflow-hidden rounded-3xl bg-blue-700 px-5 py-8 text-center text-white shadow-xl shadow-blue-900/15 sm:px-10 sm:py-10 md:flex md:items-center md:justify-between md:text-left">
            <div>
              <ShieldCheck
                aria-hidden="true"
                className="mx-auto size-7 text-blue-200 md:mx-0"
              />
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Hayalini görünür kılmaya hazır mısın?
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
                Fikrini paylaş, doğru desteğe giden ilk kapıyı aç.
              </p>
            </div>
            <Link
              href="/hayalini-paylas"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-blue-800 shadow-md hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-white md:mt-0 md:w-auto"
            >
              Hemen Başla
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
