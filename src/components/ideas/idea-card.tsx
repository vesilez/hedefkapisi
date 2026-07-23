import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STAGE_LABELS } from "@/constants/idea-stages";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import type { IdeaListItem } from "@/types/idea";
import { Heart, HeartHandshake, MapPin } from "lucide-react";
import Link from "next/link";

export function IdeaCard({ idea }: { idea: IdeaListItem }) {
  const categoryLabel =
    DEFAULT_CATEGORIES.find((category) => category.id === idea.categoryId)
      ?.label ?? "Diğer";
  const visibleSupportNeeds = idea.supportNeeds.slice(0, 3);
  const remainingSupportNeeds =
    idea.supportNeeds.length - visibleSupportNeeds.length;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{categoryLabel}</Badge>
        <Badge className="bg-slate-100 text-slate-700">
          {IDEA_STAGE_LABELS[idea.stage]}
        </Badge>
        {idea.isFeatured && (
          <Badge className="bg-amber-100 text-amber-800">Öne Çıkan</Badge>
        )}
      </div>

      <h2 className="mt-4 text-xl font-bold leading-7 text-slate-950">
        {idea.title}
      </h2>
      <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
        {idea.shortDescription}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
        {idea.city && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden="true" />
            {idea.city}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <HeartHandshake className="size-4" aria-hidden="true" />
          {idea.supportCount} destek
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-4" aria-hidden="true" />
          {idea.likeCount} beğeni
        </span>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2"
        aria-label="Destek ihtiyaçları"
      >
        {visibleSupportNeeds.map((supportType) => (
          <Badge key={supportType} className="bg-emerald-50 text-emerald-800">
            {SUPPORT_TYPE_LABELS[supportType]}
          </Badge>
        ))}
        {remainingSupportNeeds > 0 && (
          <Badge className="bg-emerald-50 text-emerald-800">
            +{remainingSupportNeeds}
          </Badge>
        )}
      </div>

      <div className="mt-auto pt-6">
        <Link
          href={`/hayaller/${idea.slug}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          aria-label={`${idea.title} fikrinin detaylarını gör`}
        >
          Detayları Gör
        </Link>
      </div>
    </Card>
  );
}
