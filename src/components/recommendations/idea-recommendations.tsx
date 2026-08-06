"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { getIdeaMatches } from "@/services/matching-service";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import type { IdeaMatch, MatchRole } from "@/types/matching";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function IdeaRecommendations({
  role,
  onSponsorOfferClick,
}: {
  role: MatchRole;
  onSponsorOfferClick?: (idea: { id: string; title: string }) => void;
}) {
  const [items, setItems] = useState<IdeaMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    const result = await getIdeaMatches(role);
    if (result.success) setItems(result.data);
    else setError(result.error.message);
  }, [role]);

  useEffect(() => {
    let active = true;
    void getIdeaMatches(role).then((result) => {
      if (!active) return;
      if (result.success) setItems(result.data);
      else setError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [role]);

  if (error)
    return (
      <Card className="mt-8 border-red-200 bg-red-50 text-center">
        <p className="font-semibold text-red-800" role="alert">
          {error}
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => void load()}
        >
          Tekrar Dene
        </Button>
      </Card>
    );

  if (!items)
    return (
      <Card className="mt-8 flex min-h-40 items-center justify-center">
        <LoadingSpinner label="Akıllı öneriler hazırlanıyor..." />
      </Card>
    );

  return (
    <section className="mt-8" aria-labelledby={`${role}-recommendations`}>
      <h2
        id={`${role}-recommendations`}
        className="text-2xl font-black text-slate-950"
      >
        Sana Önerilen Hayaller
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Profilin ve hayallerin ihtiyaçları birlikte değerlendirilir.
      </p>
      {items.length === 0 ? (
        <Card className="mt-4 text-slate-600">
          Şimdilik güçlü bir eşleşme bulunamadı.
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ idea, score, reasons }) => (
            <Card key={idea.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-950">
                  {idea.title}
                </h3>
                <Badge className="bg-emerald-100 text-emerald-800">
                  %{score} eşleşme
                </Badge>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">Kategori</dt>
                  <dd className="text-slate-800">
                    {DEFAULT_CATEGORIES.find(
                      (category) => category.id === idea.categoryId,
                    )?.label ?? idea.categoryId}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Şehir</dt>
                  <dd className="text-slate-800">
                    {idea.city ?? "Belirtilmedi"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500">
                    İhtiyaç duyulan destekler
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {idea.supportNeeds.map((support) => (
                      <Badge key={support}>
                        {SUPPORT_TYPE_LABELS[support]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-bold">Neden önerildi?</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center">
                <Link
                  href={`/hayaller/${idea.slug}`}
                  className="font-semibold text-blue-700"
                >
                  Detayları Gör →
                </Link>
                {role === "sponsor" && (
                  <Button
                    className="sm:ml-auto"
                    type="button"
                    onClick={() =>
                      onSponsorOfferClick?.({ id: idea.id, title: idea.title })
                    }
                  >
                    Destek Teklifi Gönder
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
