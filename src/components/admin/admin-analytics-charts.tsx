"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAdminAnalytics } from "@/services/admin-analytics-service";
import type {
  AdminAnalytics,
  DailyAnalyticsPoint,
} from "@/types/admin-analytics";
import { BarChart3 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const IDEA_STATUS_COLORS = ["#f59e0b", "#22c55e", "#ef4444"];
const ROLE_COLORS = ["#8b5cf6", "#10b981", "#06b6d4", "#3b82f6", "#ec4899"];
const tooltipStyle = {
  backgroundColor: "var(--chart-tooltip-background)",
  border: "1px solid var(--chart-grid)",
  borderRadius: "0.75rem",
  color: "var(--chart-text)",
};

function ChartCard({
  title,
  description,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      {isEmpty ? (
        <EmptyState
          className="mt-5 px-4 py-10"
          title="Gösterilecek veri yok"
          description="İlgili kayıtlar eklendiğinde grafik burada görünecek."
          icon={BarChart3}
        />
      ) : (
        <div className="mt-5 h-72 w-full sm:h-80">{children}</div>
      )}
    </section>
  );
}

function DailyLineChart({
  data,
  color,
}: {
  data: DailyAnalyticsPoint[];
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          stroke="var(--chart-axis)"
          tick={{ fontSize: 11 }}
          minTickGap={18}
        />
        <YAxis
          allowDecimals={false}
          stroke="var(--chart-axis)"
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [Number(value), "Kayıt"]}
          labelFormatter={(label) => `${String(label)} tarihi`}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Kayıt"
          stroke={color}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function hasValues(points: readonly { value: number }[]): boolean {
  return points.some((point) => point.value > 0);
}

function truncateTitle(value: unknown): string {
  const title = String(value);
  return title.length > 20 ? `${title.slice(0, 19)}…` : title;
}

function AnalyticsCharts({ analytics }: { analytics: AdminAnalytics }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard
        title="Son 30 gün kullanıcı kayıtları"
        description="Günlük oluşturulan kullanıcı hesabı sayısı"
        isEmpty={!analytics.userRegistrations.some((point) => point.count > 0)}
      >
        <DailyLineChart data={analytics.userRegistrations} color="#3b82f6" />
      </ChartCard>

      <ChartCard
        title="Son 30 gün hayal paylaşımı"
        description="Günlük paylaşılan hayal sayısı"
        isEmpty={!analytics.ideaCreations.some((point) => point.count > 0)}
      >
        <DailyLineChart data={analytics.ideaCreations} color="#8b5cf6" />
      </ChartCard>

      <ChartCard
        title="Hayallerin durum dağılımı"
        description="Onay sürecindeki hayallerin mevcut durumu"
        isEmpty={!hasValues(analytics.ideaStatusDistribution)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={analytics.ideaStatusDistribution}
              dataKey="value"
              nameKey="label"
              innerRadius="42%"
              outerRadius="72%"
              paddingAngle={3}
            >
              {analytics.ideaStatusDistribution.map((point, index) => (
                <Cell
                  key={point.name}
                  fill={IDEA_STATUS_COLORS[index % IDEA_STATUS_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [Number(value), "Hayal"]}
            />
            <Legend wrapperStyle={{ color: "var(--chart-text)", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Kullanıcı rol dağılımı"
        description="Platform kullanıcılarının rollere göre dağılımı"
        isEmpty={!hasValues(analytics.userRoleDistribution)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analytics.userRoleDistribution}
            margin={{ top: 8, right: 8, left: -20, bottom: 36 }}
          >
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [Number(value), "Kullanıcı"]}
            />
            <Bar dataKey="value" name="Kullanıcı" radius={[6, 6, 0, 0]}>
              {analytics.userRoleDistribution.map((point, index) => (
                <Cell
                  key={point.name}
                  fill={ROLE_COLORS[index % ROLE_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="En çok beğenilen 5 hayal"
        description="Toplam beğeni sayısına göre öne çıkan hayaller"
        isEmpty={
          analytics.mostLikedIdeas.length === 0 ||
          !analytics.mostLikedIdeas.some((idea) => idea.likeCount > 0)
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={analytics.mostLikedIdeas}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 16, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              allowDecimals={false}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={130}
              stroke="var(--chart-axis)"
              tick={{ fontSize: 11 }}
              tickFormatter={truncateTitle}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [Number(value), "Beğeni"]}
            />
            <Bar
              dataKey="likeCount"
              name="Beğeni"
              fill="#ec4899"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export function AdminAnalyticsSection({ adminId }: { adminId: string }) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    void getAdminAnalytics(adminId).then((result) => {
      if (!active) return;
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [adminId, retryKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setRetryKey((key) => key + 1);
  }

  return (
    <section className="mt-8" aria-labelledby="analytics-title">
      <div className="mb-5">
        <h2 id="analytics-title" className="text-2xl font-bold text-slate-950">
          Platform analitiği
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Kullanıcı ve hayal hareketlerinin güncel görünümü
        </p>
      </div>

      {loading && (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoadingSpinner label="Grafik verileri yükleniyor..." />
        </div>
      )}

      {!loading && error && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
          role="alert"
        >
          <p className="font-semibold text-red-800">
            Grafik verileri yüklenemedi: {error}
          </p>
          <Button className="mt-4" onClick={retry}>
            Tekrar Dene
          </Button>
        </div>
      )}

      {!loading && analytics && <AnalyticsCharts analytics={analytics} />}
    </section>
  );
}
