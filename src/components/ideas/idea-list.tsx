"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPublicIdeas } from "@/services/idea-service";
import type { IdeaListItem } from "@/types/idea";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IdeaCard } from "./idea-card";
import { IdeaFilters, type IdeaFilterValues } from "./idea-filters";

const EMPTY_FILTERS: IdeaFilterValues = {
  search: "",
  categoryId: "",
  stage: "",
  city: "",
};

export function IdeaList() {
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [filters, setFilters] = useState<IdeaFilterValues>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function retryLoading() {
    setLoading(true);
    setError(false);
    const result = await getPublicIdeas();

    if (result.success) {
      setIdeas(result.data);
    } else {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void getPublicIdeas().then((result) => {
      if (!active) return;
      if (result.success) {
        setIdeas(result.data);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const filteredIdeas = useMemo(() => {
    const search = filters.search.trim().toLocaleLowerCase("tr-TR");
    const city = filters.city.trim().toLocaleLowerCase("tr-TR");

    return ideas.filter((idea) => {
      const matchesSearch =
        !search ||
        idea.title.toLocaleLowerCase("tr-TR").includes(search) ||
        idea.shortDescription.toLocaleLowerCase("tr-TR").includes(search);
      const matchesCategory =
        !filters.categoryId || idea.categoryId === filters.categoryId;
      const matchesStage = !filters.stage || idea.stage === filters.stage;
      const matchesCity =
        !city || idea.city?.toLocaleLowerCase("tr-TR").includes(city);

      return matchesSearch && matchesCategory && matchesStage && matchesCity;
    });
  }, [filters, ideas]);

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <LoadingSpinner label="Hayaller yükleniyor..." />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          Hayaller şu anda yüklenemiyor. Lütfen daha sonra tekrar dene.
        </p>
        <Button
          type="button"
          className="mt-5"
          onClick={() => void retryLoading()}
        >
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div>
        <EmptyState
          title="Henüz yayınlanmış bir hayal yok"
          description="İlk hayali paylaşan sen olabilirsin."
          icon={Lightbulb}
        />
        <div className="mt-5 text-center">
          <Link
            href="/hayalini-paylas"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Hayalini Paylaş
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <IdeaFilters
        values={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />
      <p className="mt-5 text-sm text-slate-600" aria-live="polite">
        {filteredIdeas.length} hayal bulundu.
      </p>
      {filteredIdeas.length > 0 ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          title="Filtrelere uygun hayal bulunamadı"
          description="Filtreleri değiştirerek yeniden deneyebilirsin."
        />
      )}
    </div>
  );
}
