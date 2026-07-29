import { AdminAnalyticsDashboard } from "@/components/analytics";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Analytics",
  description: "Platform kullanıcı, hayal ve destek hareketlerini analiz edin.",
  path: "/admin/analytics",
  noIndex: true,
});

export default function AnalyticsPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Yönetim</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Analytics</h1>
        <p className="mt-3 leading-7 text-slate-600">Kullanıcı etkileşimini, içerik üretimini ve destek ekosisteminin performansını takip edin.</p>
      </div>
      <AdminAnalyticsDashboard />
    </section>
  );
}
