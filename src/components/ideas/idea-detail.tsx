"use client";

import { SupportRequestForm } from "@/components/support";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STAGE_LABELS } from "@/constants/idea-stages";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import type { PublicIdeaDetail } from "@/types/idea";
import {
  CalendarDays,
  CircleAlert,
  ExternalLink,
  FileText,
  HeartHandshake,
  Lightbulb,
  Link2,
  MapPin,
  Radio,
  Sparkles,
  Star,
  Tag,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { IdeaComments } from "./idea-comments";
import { IdeaEngagement } from "./idea-engagement";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function DetailSection({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`h-full ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h2 className="text-lg font-bold text-slate-950 sm:text-xl">{title}</h2>
      </div>
      <div className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
        {children}
      </div>
    </Card>
  );
}

export function IdeaDetail({ idea }: { idea: PublicIdeaDetail }) {
  const categoryLabel =
    DEFAULT_CATEGORIES.find((item) => item.id === idea.categoryId)?.label ??
    "Diğer";
  const ownerLabel =
    idea.visibility === "anonymous"
      ? "Öğrenci adı gizli"
      : "Hedef Kapısı öğrencisi";
  const links = [
    { href: idea.prototypeUrl, label: "Prototipi İncele" },
    { href: idea.githubUrl, label: "GitHub Deposunu Aç" },
    { href: idea.websiteUrl, label: "Proje Web Sitesini Aç" },
  ].filter(
    (link): link is { href: string; label: string } => Boolean(link.href),
  );

  return (
    <main className="mx-auto min-w-0 max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 shadow-sm sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-64 rounded-full bg-blue-200 opacity-40 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 border border-blue-200 bg-white text-blue-800 shadow-sm">
              <Tag aria-hidden="true" className="size-3.5" />
              {categoryLabel}
            </Badge>
            <Badge className="gap-1.5 bg-emerald-100 text-emerald-800">
              <Radio aria-hidden="true" className="size-3.5" />
              Yayında
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              {IDEA_STAGE_LABELS[idea.stage]}
            </Badge>
            {idea.isFeatured && (
              <Badge className="gap-1 bg-amber-100 text-amber-800">
                <Star aria-hidden="true" className="size-3.5" />
                Öne Çıkan
              </Badge>
            )}
          </div>

          <h1 className="mt-6 max-w-4xl break-words text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {idea.title}
          </h1>
          <p className="mt-5 max-w-3xl break-words text-base font-medium leading-7 text-slate-700 sm:text-lg sm:leading-8">
            {idea.shortDescription}
          </p>

          <dl className="mt-7 grid gap-3 border-t border-blue-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">Şehir</dt>
                <dd className="mt-0.5 break-words text-sm font-bold text-slate-800">
                  {idea.city || "Belirtilmedi"}
                </dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <CalendarDays
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <div>
                <dt className="text-xs font-semibold text-slate-500">
                  Oluşturulma tarihi
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-800">
                  {formatDate(idea.publishedAt ?? idea.createdAt)}
                </dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <UserRound
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <div className="min-w-0">
                <dt className="text-xs font-semibold text-slate-500">
                  Hayal sahibi
                </dt>
                <dd className="mt-0.5 break-words text-sm font-bold text-slate-800">
                  {ownerLabel}
                </dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <HeartHandshake
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-blue-700"
              />
              <div>
                <dt className="text-xs font-semibold text-slate-500">
                  Destek
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-800">
                  {idea.supportCount} başvuru
                </dd>
              </div>
            </div>
          </dl>

          <IdeaEngagement
            ideaId={idea.id}
            ideaTitle={idea.title}
            initialLikeCount={idea.likeCount}
          />
        </div>
      </header>

      <section
        className="mt-7 grid gap-4 sm:mt-8 sm:gap-5 lg:grid-cols-2"
        aria-label="Hayal detayları"
      >
        <DetailSection
          title="Kısa Açıklama"
          icon={Sparkles}
          className="lg:col-span-2"
        >
          <p className="text-base font-semibold text-slate-800 sm:text-lg">
            {idea.shortDescription}
          </p>
        </DetailSection>
        <DetailSection
          title="Fikir Hakkında"
          icon={FileText}
          className="lg:col-span-2"
        >
          {idea.description}
        </DetailSection>
        <DetailSection title="Hangi Problemi Çözüyor?" icon={CircleAlert}>
          {idea.problem}
        </DetailSection>
        <DetailSection title="Çözüm Önerisi" icon={Lightbulb}>
          {idea.solution}
        </DetailSection>
        <DetailSection title="Hedef Kitle" icon={UsersRound}>
          {idea.targetAudience}
        </DetailSection>
        <DetailSection title="İhtiyaç Duyulan Destekler" icon={HeartHandshake}>
          {idea.supportNeeds.length > 0 ? (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="İhtiyaç duyulan destek türleri"
            >
              {idea.supportNeeds.map((type) => (
                <li key={type}>
                  <Badge className="bg-emerald-50 text-emerald-800">
                    {SUPPORT_TYPE_LABELS[type]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p>Henüz bir destek ihtiyacı belirtilmedi.</p>
          )}
        </DetailSection>
      </section>

      {links.length > 0 && (
        <Card className="mt-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Link2 aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-950 sm:text-xl">
              Proje Bağlantıları
            </h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-sm focus-visible:outline-blue-700"
                >
                  <span className="break-words">{link.label}</span>
                  <ExternalLink
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SupportRequestForm ideaId={idea.id} />
      <IdeaComments ideaId={idea.id} />
    </main>
  );
}
