import Link from "next/link";
import { siteConfig } from "@/config/site";
import { PageContainer } from "./page-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 py-10 text-slate-300">
      <PageContainer className="flex flex-col justify-between gap-8 md:flex-row">
        <div className="max-w-xl">
          <p className="font-bold text-white">{siteConfig.name}</p>
          <p className="mt-2 text-sm leading-6">
            {siteConfig.shortDescription}
          </p>
        </div>
        <nav
          aria-label="Yasal bağlantılar"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
        >
          <Link href="/kvkk" className="hover:text-white">
            KVKK
          </Link>
          <Link href="/gizlilik-politikasi" className="hover:text-white">
            Gizlilik Politikası
          </Link>
          <Link href="/kullanim-sartlari" className="hover:text-white">
            Kullanım Şartları
          </Link>
        </nav>
      </PageContainer>
      <PageContainer className="mt-8 border-t border-slate-800 pt-6 text-xs">
        © {new Date().getFullYear()} {siteConfig.name}. Tüm hakları saklıdır.
      </PageContainer>
    </footer>
  );
}
