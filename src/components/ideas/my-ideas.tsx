"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STAGE_LABELS } from "@/constants/idea-stages";
import type { IdeaStatus } from "@/constants/idea-statuses";
import { useAuth } from "@/hooks/use-auth";
import { getIdeasByStudent } from "@/services/idea-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { Idea } from "@/types/idea";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_LABELS = {
  draft: "Taslak",
  pending: "Onay Bekliyor",
  approved: "Yayında",
  rejected: "Reddedildi",
  revision_requested: "Revizyon İstendi",
  archived: "Arşivlendi",
} as const satisfies Record<IdeaStatus, string>;

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  revision_requested: "bg-orange-100 text-orange-800",
  archived: "bg-slate-200 text-slate-700",
} as const satisfies Record<IdeaStatus, string>;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusDescription(idea: Idea): string {
  switch (idea.status) {
    case "draft":
      return "Henüz admin değerlendirmesine gönderilmedi.";
    case "pending":
      return "Yönetim değerlendirmesi bekleniyor.";
    case "approved":
      return "Fikrin yayında.";
    case "rejected":
      return idea.rejectionReason || "Fikir yönetim tarafından reddedildi.";
    case "revision_requested":
      return idea.revisionNote || "Fikir için revizyon istendi.";
    case "archived":
      return "Bu fikir arşivlendi.";
  }
}

function IdeaCard({ idea }: { idea: Idea }) {
  const router = useRouter();
  const category =
    DEFAULT_CATEGORIES.find((item) => item.id === idea.categoryId)?.label ??
    "Diğer";
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge className={STATUS_STYLES[idea.status]}>
          {STATUS_LABELS[idea.status]}
        </Badge>
        <span className="text-sm font-medium text-slate-500">{category}</span>
      </div>

      <h2 className="mt-4 text-xl font-bold leading-7 text-slate-950">
        {idea.title}
      </h2>
      <p className="mt-2 line-clamp-3 leading-7 text-slate-600">
        {idea.shortDescription}
      </p>

      <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-700">Şehir</dt>
          <dd className="mt-1 text-slate-600">{idea.city || "Belirtilmedi"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Aşama</dt>
          <dd className="mt-1 text-slate-600">
            {IDEA_STAGE_LABELS[idea.stage]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Oluşturulma</dt>
          <dd className="mt-1 text-slate-600">{formatDate(idea.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Güncellenme</dt>
          <dd className="mt-1 text-slate-600">{formatDate(idea.updatedAt)}</dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {statusDescription(idea)}
      </p>

      <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
        <Button
          variant="secondary"
          disabled={idea.status !== "approved"}
          title={
            idea.status === "approved"
              ? undefined
              : "Özel fikir detayı daha sonra eklenecek."
          }
          onClick={() => router.push(`/hayaller/${idea.slug}`)}
        >
          Detayları Gör
        </Button>
        {(idea.status === "draft" ||
          idea.status === "revision_requested") && (
          <Link
            href={`/fikirlerim/${idea.id}/duzenle`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Düzenle
          </Link>
        )}
      </div>
    </Card>
  );
}

export function MyIdeas() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;

    void getUserAccessProfile(user.id).then(async (profileResult) => {
      if (!active) return;
      if (!profileResult.success || !profileResult.data) {
        setLoadFailed(true);
        setCheckedUserId(user.id);
        return;
      }

      const student = profileResult.data.role === "student";
      setIsStudent(student);
      if (!student) {
        setLoadFailed(false);
        setCheckedUserId(user.id);
        return;
      }

      const ideasResult = await getIdeasByStudent(user.id);
      if (!active) return;
      if (ideasResult.success) {
        setIdeas(ideasResult.data);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
      setCheckedUserId(user.id);
    });

    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  if (authLoading || !user || checkedUserId !== user.id) {
    return (
      <PageContainer className="flex min-h-80 items-center justify-center py-12">
        <LoadingSpinner label="Fikirlerin yükleniyor..." />
      </PageContainer>
    );
  }

  if (isStudent === false) {
    return (
      <PageContainer className="py-12 sm:py-16">
        <Card className="text-center text-slate-700">
          Bu alan yalnızca öğrenciler içindir.
        </Card>
      </PageContainer>
    );
  }

  if (loadFailed) {
    return (
      <PageContainer className="py-12 sm:py-16">
        <Card className="text-center" role="alert">
          <p className="font-semibold text-red-800">
            Fikirlerin şu anda yüklenemiyor.
          </p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Benim Fikirlerim
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Paylaştığın fikirleri ve değerlendirme durumlarını buradan takip
          edebilirsin.
        </p>
      </div>

      {ideas.length === 0 ? (
        <div>
          <EmptyState
            title="Henüz bir fikir paylaşmadın"
            description="İlk fikrini paylaşarak yolculuğa başlayabilirsin."
            icon={Lightbulb}
          />
          <div className="mt-5 flex justify-center">
            <Button onClick={() => router.push("/hayalini-paylas")}>
              Hayalini Paylaş
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
