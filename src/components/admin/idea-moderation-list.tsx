"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import {
  IDEA_STATUS_LABELS,
  type IdeaStatus,
} from "@/constants/idea-statuses";
import { isAdminRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  approveIdea,
  deleteAdminIdea,
  getAdminIdeas,
  rejectAdminIdea,
  type AdminIdeaListItem,
} from "@/services/idea-service";
import {
  getUserAccessProfile,
  subscribeToUserAccessProfile,
  type UserServiceResult,
  type UserAccessProfile,
} from "@/services/user-service";
import { Lightbulb, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ViewState =
  | "loading"
  | "ready"
  | "forbidden"
  | "profile-error"
  | "ideas-error";

type IdeaAction = "approve" | "reject" | "delete";

interface ActiveAction {
  ideaId: string;
  action: IdeaAction;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

export function IdeaModerationList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<AdminIdeaListItem[]>([]);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function loadAdminIdeas(userId: string) {
    setState("loading");
    const profileResult = await getUserAccessProfile(userId);

    await applyAccessProfile(userId, profileResult);
  }

  async function applyAccessProfile(
    userId: string,
    profileResult: UserServiceResult<UserAccessProfile | null>,
  ) {
    setState("loading");
    setAccessUserId(userId);

    if (!profileResult.success) {
      setState("profile-error");
      return;
    }

    if (!profileResult.data) {
      setState("profile-error");
      return;
    }

    if (!isAdminRole(profileResult.data.role)) {
      setState("forbidden");
      return;
    }

    const ideasResult = await getAdminIdeas(userId);
    if (ideasResult.success) {
      setIdeas(ideasResult.data);
      setState("ready");
    } else {
      setState("ideas-error");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getUserAccessProfile(user.id).then((profileResult) => {
      if (!active) return;
      void applyAccessProfile(user.id, profileResult);
    });
    const unsubscribe = subscribeToUserAccessProfile(user.id, (profileResult) => {
      if (!active) return;
      void applyAccessProfile(user.id, profileResult);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authLoading, router, user]);

  async function retry() {
    if (!user) return;
    setFeedback(null);
    await loadAdminIdeas(user.id);
  }

  async function updateIdeaStatus(
    ideaId: string,
    action: "approve" | "reject",
  ) {
    if (!user || activeAction) return;

    setActiveAction({ ideaId, action });
    setFeedback(null);
    const result =
      action === "approve"
        ? await approveIdea(ideaId, user.id)
        : await rejectAdminIdea(ideaId, user.id);

    if (result.success) {
      const status = action === "approve" ? "approved" : "rejected";
      setIdeas((currentIdeas) =>
        currentIdeas.map((item) =>
          item.idea.id === ideaId
            ? { ...item, idea: { ...item.idea, status } }
            : item,
        ),
      );
      setFeedback({
        type: "success",
        message:
          action === "approve"
            ? "Hayal başarıyla onaylandı."
            : "Hayal başarıyla reddedildi.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }

    setActiveAction(null);
  }

  async function deleteIdea(ideaId: string) {
    if (!user || activeAction) return;
    if (!window.confirm("Bu hayali kalıcı olarak silmek istediğine emin misin?")) {
      return;
    }

    setActiveAction({ ideaId, action: "delete" });
    setFeedback(null);
    const result = await deleteAdminIdea(ideaId, user.id);

    if (result.success) {
      setIdeas((currentIdeas) =>
        currentIdeas.filter((item) => item.idea.id !== ideaId),
      );
      setFeedback({
        type: "success",
        message: "Hayal başarıyla silindi.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }

    setActiveAction(null);
  }

  if (
    authLoading ||
    state === "loading" ||
    (user !== null && accessUserId !== user.id)
  ) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
        <LoadingSpinner label="Fikirler yükleniyor..." />
      </div>
    );
  }

  if (!user) return null;

  if (state === "forbidden") {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
        role="alert"
      >
        Bu alana erişim yetkin yok.
      </div>
    );
  }

  if (state === "profile-error") {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          Kullanıcı profili yüklenemedi.
        </p>
        <Button type="button" className="mt-4" onClick={() => void retry()}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (state === "ideas-error") {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          Fikirler şu anda yüklenemiyor.
        </p>
        <Button type="button" className="mt-4" onClick={() => void retry()}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div>
      {feedback && (
        <p
          className={
            feedback.type === "success"
              ? "mb-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"
              : "mb-5 rounded-xl bg-red-50 p-4 font-semibold text-red-800"
          }
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      )}
      {ideas.length === 0 ? (
        <div>
          <EmptyState
            title="Henüz hayal yok"
            description="Paylaşılan hayaller burada görüntülenecek."
            icon={Lightbulb}
          />
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void retry()}
            >
              Listeyi Yenile
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Başlık
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Kullanıcı
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Kategori
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Durum
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    Oluşturulma
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ideas.map(({ idea, userName }) => (
                  <tr
                    key={idea.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="max-w-sm px-5 py-4">
                      <p className="font-semibold text-slate-950">
                        {idea.title}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      {userName}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {DEFAULT_CATEGORIES.find(
                        (category) => category.id === idea.categoryId,
                      )?.label ?? "Diğer"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <IdeaStatusBadge status={idea.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                      }).format(new Date(idea.createdAt))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        {idea.status === "pending" && (
                          <>
                            <Button
                              className="min-h-9 px-3 py-1.5 text-xs"
                              disabled={activeAction?.ideaId === idea.id}
                              onClick={() =>
                                void updateIdeaStatus(idea.id, "approve")
                              }
                            >
                              {activeAction?.ideaId === idea.id &&
                                activeAction.action === "approve" && (
                                  <LoaderCircle
                                    aria-hidden="true"
                                    className="mr-1.5 size-4 animate-spin"
                                  />
                                )}
                              Onayla
                            </Button>
                            <Button
                              variant="secondary"
                              className="min-h-9 border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                              disabled={activeAction?.ideaId === idea.id}
                              onClick={() =>
                                void updateIdeaStatus(idea.id, "reject")
                              }
                            >
                              {activeAction?.ideaId === idea.id &&
                                activeAction.action === "reject" && (
                                  <LoaderCircle
                                    aria-hidden="true"
                                    className="mr-1.5 size-4 animate-spin"
                                  />
                                )}
                              Reddet
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          className="min-h-9 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                          disabled={activeAction?.ideaId === idea.id}
                          onClick={() => void deleteIdea(idea.id)}
                        >
                          {activeAction?.ideaId === idea.id &&
                            activeAction.action === "delete" && (
                              <LoaderCircle
                                aria-hidden="true"
                                className="mr-1.5 size-4 animate-spin"
                              />
                            )}
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE_CLASSES = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  revision_requested: "bg-violet-100 text-violet-800",
  archived: "bg-zinc-200 text-zinc-700",
} as const satisfies Record<IdeaStatus, string>;

function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <Badge className={STATUS_BADGE_CLASSES[status]}>
      {IDEA_STATUS_LABELS[status]}
    </Badge>
  );
}
