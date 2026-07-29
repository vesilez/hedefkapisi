"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import {
  buildAnalyticsCsv,
  defaultAnalyticsDateRange,
  getAnalyticsReport,
} from "@/services/analytics-service";
import type { DailyAnalyticsPoint } from "@/types/admin-analytics";
import type {
  ActiveEntityMetric,
  AdminAnalyticsReport,
  CategorySupportMetric,
  RankedIdeaMetric,
} from "@/types/analytics";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  Eye,
  Heart,
  Lightbulb,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--chart-tooltip-background)",
  border: "1px solid var(--chart-grid)",
  borderRadius: "0.75rem",
  color: "var(--chart-text)",
};

export function AdminAnalyticsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const initialRange = defaultAnalyticsDateRange();
  const [draftRange, setDraftRange] = useState(initialRange);
  const [range, setRange] = useState(initialRange);
  const [report, setReport] = useState<AdminAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    let active = true;
    void getAnalyticsReport(user.id, range).then((result) => {
      if (!active) return;
      if (result.success) {
        setReport(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user, range, retryKey]);

  function applyRange() {
    setLoading(true);
    setError(null);
    setRange(draftRange);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRetryKey((value) => value + 1);
  }

  function exportCsv() {
    if (!report) return;
    const blob = new Blob([buildAnalyticsCsv(report)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hedef-kapisi-analytics-${report.range.from}-${report.range.to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Card className="mb-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-700">
              <CalendarDays aria-hidden="true" className="size-4" />
              Tarih aralığı
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Sıralamalar seçilen aralıkta oluşan hareketlerden hesaplanır.
              DAU, WAU, MAU ve 30 günlük grafikler güncel hareketli dönemdir.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Başlangıç
              <Input
                type="date"
                value={draftRange.from}
                onChange={(event) =>
                  setDraftRange((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Bitiş
              <Input
                type="date"
                value={draftRange.to}
                onChange={(event) =>
                  setDraftRange((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              />
            </label>
            <Button className="self-end" onClick={applyRange}>
              Uygula
            </Button>
            <Button
              className="self-end"
              variant="secondary"
              onClick={exportCsv}
              disabled={!report || loading}
            >
              <Download aria-hidden="true" className="size-4" />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {!authLoading && !user && (
        <Card className="text-center">
          <p role="alert" className="font-semibold text-red-800">
            Analytics sayfasını görüntülemek için giriş yapmalısınız.
          </p>
        </Card>
      )}

      {(loading || authLoading) && (authLoading || Boolean(user)) && (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoadingSpinner label="Analytics verileri hazırlanıyor..." />
        </div>
      )}

      {!loading && error && (
        <Card className="text-center">
          <p role="alert" className="font-semibold text-red-800">
            {error}
          </p>
          <Button className="mt-4" onClick={retry}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Yeniden dene
          </Button>
        </Card>
      )}

      {!loading && report && (
        <>
          <MetricCards report={report} />
          <section className="mt-7 grid gap-5 xl:grid-cols-3">
            <TrendChart
              title="Son 30 gün kullanıcı artışı"
              data={report.userGrowth}
              color="#2563eb"
              label="Yeni kullanıcı"
            />
            <TrendChart
              title="Son 30 gün hayal paylaşımı"
              data={report.ideaGrowth}
              color="#7c3aed"
              label="Yeni hayal"
            />
            <TrendChart
              title="Son 30 gün destek başvuruları"
              data={report.supportGrowth}
              color="#059669"
              label="Başvuru"
            />
          </section>
          <section className="mt-7 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <IdeaRanking
              title="En çok görüntülenen hayaller"
              icon={<Eye aria-hidden="true" className="size-5" />}
              items={report.mostViewedIdeas}
              suffix="görüntülenme"
            />
            <IdeaRanking
              title="En çok beğenilen hayaller"
              icon={<Heart aria-hidden="true" className="size-5" />}
              items={report.mostLikedIdeas}
              suffix="beğeni"
            />
            <EntityRanking
              title="En aktif mentorlar"
              items={report.mostActiveMentors}
              suffix="aktivite"
            />
            <EntityRanking
              title="En aktif sponsorlar"
              items={report.mostActiveSponsors}
              suffix="resmî destek"
            />
            <CategoryRanking items={report.mostSupportedCategories} />
          </section>
        </>
      )}
    </div>
  );
}

function MetricCards({ report }: { report: AdminAnalyticsReport }) {
  const metrics = [
    { label: "Günlük aktif kullanıcı", value: report.metrics.dailyActiveUsers, icon: Activity },
    { label: "Haftalık aktif kullanıcı", value: report.metrics.weeklyActiveUsers, icon: Users },
    { label: "Aylık aktif kullanıcı", value: report.metrics.monthlyActiveUsers, icon: Users },
    { label: "Toplam kayıt", value: report.metrics.totalUsers, icon: Users },
    { label: "Günlük yeni kayıt", value: report.metrics.dailyNewUsers, icon: UserPlus },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-5">
          <Icon aria-hidden="true" className="size-6 text-blue-700" />
          <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
        </Card>
      ))}
    </section>
  );
}

function TrendChart({
  title,
  data,
  color,
  label,
}: {
  title: string;
  data: DailyAnalyticsPoint[];
  color: string;
  label: string;
}) {
  const empty = !data.some((point) => point.count > 0);
  return (
    <Card>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      {empty ? (
        <EmptyState className="mt-4 px-3 py-10" icon={BarChart3} title="Henüz veri yok" description="İlgili hareket oluştuğunda grafik güncellenecek." />
      ) : (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 10 }} minTickGap={18} />
              <YAxis allowDecimals={false} stroke="var(--chart-axis)" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value), label]} />
              <Line type="monotone" dataKey="count" stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function RankingCard({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: ReactNode;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
        <span className="text-blue-700">{icon}</span>{title}
      </h2>
      {empty ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Seçilen tarih aralığında veri yok.</p>
      ) : (
        <ol className="mt-5 space-y-3">{children}</ol>
      )}
    </Card>
  );
}

function IdeaRanking({ title, icon, items, suffix }: { title: string; icon: ReactNode; items: RankedIdeaMetric[]; suffix: string }) {
  return (
    <RankingCard title={title} icon={icon} empty={!items.length}>
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-800">{index + 1}</span>
          <div className="min-w-0 flex-1">
            {item.slug ? <Link href={`/hayaller/${item.slug}`} className="block truncate font-bold text-slate-950 hover:text-blue-700">{item.title}</Link> : <p className="truncate font-bold text-slate-950">{item.title}</p>}
            <p className="text-xs text-slate-500">{item.value} {suffix}</p>
          </div>
        </li>
      ))}
    </RankingCard>
  );
}

function EntityRanking({ title, items, suffix }: { title: string; items: ActiveEntityMetric[]; suffix: string }) {
  return (
    <RankingCard title={title} icon={<Activity aria-hidden="true" className="size-5" />} empty={!items.length}>
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-800">{index + 1}. {item.name}</span>
          <span className="shrink-0 text-xs font-bold text-blue-700">{item.activityCount} {suffix}</span>
        </li>
      ))}
    </RankingCard>
  );
}

function CategoryRanking({ items }: { items: CategorySupportMetric[] }) {
  return (
    <RankingCard title="En çok destek verilen kategoriler" icon={<Lightbulb aria-hidden="true" className="size-5" />} empty={!items.length}>
      {items.map((item, index) => (
        <li key={item.id} className="flex items-center justify-between gap-3">
          <span className="truncate font-semibold text-slate-800">{index + 1}. {item.label}</span>
          <span className="shrink-0 text-xs font-bold text-blue-700">{item.supportCount} destek</span>
        </li>
      ))}
    </RankingCard>
  );
}
