"use client";

import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { getMatchingAnalytics } from "@/services/matching-service";
import type { MatchingAnalytics as MatchingAnalyticsData, MatchRole } from "@/types/matching";
import { useEffect, useState } from "react";

const roleLabels: Record<MatchRole, string> = { sponsor: "Sponsor", mentor: "Mentor", supporter: "Destekçi" };

export function MatchingAnalytics({ adminId }: { adminId: string }) {
  const [data, setData] = useState<MatchingAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void getMatchingAnalytics(adminId).then((result) => { if (!active) return; if (result.success) setData(result.data); else setError(result.error.message); }); return () => { active = false; }; }, [adminId]);
  return (
    <section className="mt-8" aria-labelledby="matching-analytics-title">
      <h2 id="matching-analytics-title" className="text-2xl font-black text-slate-950">Eşleştirme Analizi</h2>
      <p className="mt-1 text-sm text-slate-600">Aktif profiller için üretilen ilk 10 önerinin dağılımı.</p>
      {error ? <Card className="mt-4 text-red-700">{error}</Card> : !data ? <LoadingSpinner label="Eşleştirme analizi hazırlanıyor..." /> : <>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">{data.byRole.map((item) => <Card key={item.role}><p className="text-sm font-semibold text-slate-500">{roleLabels[item.role]}</p><p className="mt-2 text-3xl font-black text-slate-950">{item.recommendationCount}</p><p className="mt-1 text-sm text-slate-600">Ortalama eşleşme: %{item.averageScore}</p></Card>)}</div>
        <Card className="mt-4"><h3 className="font-bold text-slate-950">En çok önerilen kategoriler</h3>{data.topCategories.length === 0 ? <p className="mt-3 text-sm text-slate-500">Henüz öneri verisi yok.</p> : <ol className="mt-3 grid gap-2 sm:grid-cols-2">{data.topCategories.map((item) => <li key={item.categoryId} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{DEFAULT_CATEGORIES.find((category) => category.id === item.categoryId)?.label ?? item.categoryId}</span><strong>{item.count}</strong></li>)}</ol>}</Card>
      </>}
    </section>
  );
}
