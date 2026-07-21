"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import type { IdeaFormInput } from "@/lib/validations/idea-schema";
import { getIdeaForEdit } from "@/services/idea-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { Idea } from "@/types/idea";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IdeaForm } from "./idea-form";

type LoadState =
  | "loading"
  | "ready"
  | "wrong-role"
  | "not-found"
  | "not-editable"
  | "error";

function formValuesFromIdea(idea: Idea): IdeaFormInput {
  return {
    title: idea.title,
    shortDescription: idea.shortDescription,
    description: idea.description,
    problem: idea.problem,
    solution: idea.solution,
    targetAudience: idea.targetAudience,
    categoryId: idea.categoryId,
    city: idea.city ?? "",
    stage: idea.stage,
    supportNeeds: idea.supportNeeds,
    visibility: idea.visibility,
    coverImageUrl: idea.coverImageUrl,
    attachmentUrls: idea.attachmentUrls,
    prototypeUrl: idea.prototypeUrl ?? "",
    githubUrl: idea.githubUrl ?? "",
    websiteUrl: idea.websiteUrl ?? "",
  };
}

export function IdeaEdit({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [idea, setIdea] = useState<Idea | null>(null);

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
        setState("error");
        return;
      }
      if (profileResult.data.role !== "student") {
        setState("wrong-role");
        return;
      }

      const ideaResult = await getIdeaForEdit(ideaId, user.id);
      if (!active) return;
      if (!ideaResult.success) {
        setState("error");
        return;
      }
      if (!ideaResult.data) {
        setState("not-found");
        return;
      }
      if (
        ideaResult.data.status !== "draft" &&
        ideaResult.data.status !== "revision_requested"
      ) {
        setState("not-editable");
        return;
      }

      setIdea(ideaResult.data);
      setState("ready");
    });

    return () => {
      active = false;
    };
  }, [authLoading, ideaId, router, user]);

  if (authLoading || !user || state === "loading") {
    return (
      <PageContainer className="flex min-h-80 items-center justify-center py-12">
        <LoadingSpinner label="Fikir yükleniyor..." />
      </PageContainer>
    );
  }

  if (state !== "ready" || !idea) {
    const message =
      state === "wrong-role"
        ? "Bu alan yalnızca öğrenciler içindir."
        : state === "not-editable"
          ? "Bu fikir mevcut durumunda düzenlenemez."
          : state === "not-found"
            ? "Fikir bulunamadı veya erişim yetkin yok."
            : "Fikir şu anda yüklenemiyor. Lütfen daha sonra tekrar dene.";

    return (
      <PageContainer className="py-12 sm:py-16">
        <Card className="mx-auto max-w-3xl text-center" role="alert">
          <p className="font-semibold text-slate-800">{message}</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Fikrini Düzenle
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Fikrini güncelle ve hazır olduğunda yeniden değerlendirmeye gönder.
        </p>
      </div>
      <IdeaForm
        mode="edit"
        ideaId={idea.id}
        initialValues={formValuesFromIdea(idea)}
        currentStatus={idea.status}
        revisionNote={idea.revisionNote}
      />
    </PageContainer>
  );
}
