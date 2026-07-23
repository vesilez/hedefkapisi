"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SupportRequestForm } from "@/components/support";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STAGE_LABELS } from "@/constants/idea-stages";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import type { PublicIdeaDetail } from "@/types/idea";
import { IdeaComments } from "./idea-comments";
import { CalendarDays, ExternalLink, HeartHandshake, MapPin, Star, UserRoundX } from "lucide-react";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-7 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-3 whitespace-pre-line leading-8 text-slate-700">{children}</div>
    </section>
  );
}

export function IdeaDetail({ idea }: { idea: PublicIdeaDetail }) {
  const categoryLabel = DEFAULT_CATEGORIES.find((item) => item.id === idea.categoryId)?.label ?? "Diğer";
  const links = [
    { href: idea.prototypeUrl, label: "Prototipi İncele" },
    { href: idea.githubUrl, label: "GitHub Deposunu Aç" },
    { href: idea.websiteUrl, label: "Proje Web Sitesini Aç" },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header>
        <div className="flex flex-wrap gap-2">
          <Badge>{categoryLabel}</Badge>
          <Badge className="bg-slate-100 text-slate-700">{IDEA_STAGE_LABELS[idea.stage]}</Badge>
          {idea.isFeatured && <Badge className="gap-1 bg-amber-100 text-amber-800"><Star className="size-3.5" aria-hidden="true" /> Öne Çıkan</Badge>}
        </div>
        <h1 className="mt-5 max-w-4xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{idea.title}</h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          {idea.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" /> {idea.city}</span>}
          <span className="inline-flex items-center gap-1.5"><HeartHandshake className="size-4" aria-hidden="true" />{idea.supportCount} destek</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{formatDate(idea.publishedAt ?? idea.createdAt)}</span>
          {idea.visibility === "anonymous" && <span className="inline-flex items-center gap-1.5 font-medium"><UserRoundX className="size-4" aria-hidden="true" />Öğrenci adı gizli</span>}
        </div>
      </header>

      <Card className="mt-9 grid gap-8 p-6 sm:p-8">
        <DetailSection title="Kısa Açıklama"><p className="text-lg font-medium text-slate-800">{idea.shortDescription}</p></DetailSection>
        <DetailSection title="Fikir Hakkında">{idea.description}</DetailSection>
        <DetailSection title="Hangi Problemi Çözüyor?">{idea.problem}</DetailSection>
        <DetailSection title="Çözüm Önerisi">{idea.solution}</DetailSection>
        <DetailSection title="Hedef Kitle">{idea.targetAudience}</DetailSection>
        {idea.supportNeeds.length > 0 && (
          <DetailSection title="İhtiyaç Duyulan Destekler">
            <ul className="flex flex-wrap gap-2" aria-label="Destek ihtiyaçları">
              {idea.supportNeeds.map((type) => <li key={type}><Badge className="bg-emerald-50 text-emerald-800">{SUPPORT_TYPE_LABELS[type]}</Badge></li>)}
            </ul>
          </DetailSection>
        )}
        {links.length > 0 && (
          <DetailSection title="Proje Bağlantıları">
            <ul className="grid gap-3 sm:grid-cols-2">
              {links.map((link) => <li key={link.label}><a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">{link.label}<ExternalLink className="size-4" aria-hidden="true" /></a></li>)}
            </ul>
          </DetailSection>
        )}
      </Card>

      <SupportRequestForm ideaId={idea.id} />
      <IdeaComments ideaId={idea.id} />
    </div>
  );
}
