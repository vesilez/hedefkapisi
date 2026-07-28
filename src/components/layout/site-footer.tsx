import Link from "next/link";
import {
  ArrowUpRight,
  Github,
  Instagram,
  Linkedin,
  Mail,
  Target,
} from "lucide-react";
import { mainNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <PageContainer className="grid gap-10 py-12 sm:py-14 md:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
        <div className="max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-blue-300"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Target aria-hidden="true" className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              {siteConfig.name}
            </span>
          </Link>
          <p className="mt-5 text-sm leading-7 text-slate-400">
            {siteConfig.shortDescription}
          </p>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            İletişim
          </p>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-blue-500 hover:bg-slate-800 hover:text-white focus-visible:outline-blue-300"
          >
            <Mail aria-hidden="true" className="size-4 text-blue-300" />
            {siteConfig.contactEmail}
          </a>
          <div className="mt-4 flex items-center gap-2" aria-label="Sosyal medya">
            {[
              { label: "Instagram hesabı yakında", icon: Instagram },
              { label: "LinkedIn hesabı yakında", icon: Linkedin },
              { label: "GitHub hesabı yakında", icon: Github },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                aria-label={label}
                aria-disabled="true"
                title={label}
                className="flex size-10 items-center justify-center rounded-xl border border-slate-800 text-slate-500"
              >
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
            ))}
          </div>
        </div>

        <nav
          aria-label="Footer ana bağlantıları"
          className="grid content-start gap-1"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Platform
          </p>
          {mainNavigation.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-blue-300"
            >
              {item.label}
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          ))}
        </nav>

        <nav
          aria-label="Yasal bağlantılar"
          className="grid content-start gap-1"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Yasal
          </p>
          {[
            { href: "/kvkk", label: "KVKK" },
            { href: "/gizlilik-politikasi", label: "Gizlilik Politikası" },
            { href: "/kullanim-sartlari", label: "Kullanım Şartları" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="min-h-10 rounded-lg px-2 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-blue-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </PageContainer>

      <PageContainer className="border-t border-slate-800 py-6">
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Tüm hakları
            saklıdır.
          </p>
          <p>Gençlerin fikirlerini geleceğe taşıyan buluşma noktası.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
