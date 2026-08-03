"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getIdeaMatches } from "@/services/matching-service";
import type { IdeaMatch, MatchRole } from "@/types/matching";
import Link from "next/link";
import { useEffect, useState } from "react";

export function IdeaRecommendations({ role }: { role: MatchRole }) {
  const [items, setItems] = useState<IdeaMatch[] | null>(null);
  useEffect(() => {
    let active = true;
    void getIdeaMatches(role).then((result) => {
      if (active) setItems(result.success ? result.data : []);
    });
    return () => { active = false; };
  }, [role]);
  if (!items) return <LoadingSpinner label="Akıllı öneriler hazırlanıyor..." />;
  return (
    <section aria-labelledby={`${role}-recommendations`}>
      <h2 id={`${role}-recommendations`} className="text-2xl font-black text-slate-950">
        Sana Önerilen Hayaller
      </h2>
      <p className="mt-2 text-sm text-slate-600">Profilin ve hayallerin ihtiyaçları birlikte değerlendirilir.</p>
      {items.length === 0 ? <Card className="mt-4 text-slate-600">Şimdilik güçlü bir eşleşme bulunamadı.</Card> : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ idea, score, reasons }) => (
            <Card key={idea.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-950">{idea.title}</h3>
                <Badge className="bg-emerald-100 text-emerald-800">%{score} eşleşme</Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{idea.shortDescription}</p>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-bold">Neden önerildi?</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
              <Link href={`/hayaller/${idea.slug}`} className="mt-4 font-semibold text-blue-700">Hayali incele →</Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
