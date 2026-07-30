"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AdminPagination,
  AdminToast,
  ConfirmationDialog,
} from "./admin-table-tools";
import { exportCsv } from "@/lib/utils/export-csv";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STATUS_LABELS, type IdeaStatus } from "@/constants/idea-statuses";
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
import { Download, Lightbulb, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ViewState =
  "loading" | "ready" | "forbidden" | "profile-error" | "ideas-error";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const pageSize = 10;

  const filteredIdeas = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return ideas
      .filter(({ idea, userName }) => {
        const matchesSearch =
          !term ||
          idea.title.toLocaleLowerCase("tr-TR").includes(term) ||
          userName.toLocaleLowerCase("tr-TR").includes(term);
        return matchesSearch && (statusFilter === "all" || idea.status === statusFilter);
      })
      .sort((first, second) =>
        sort === "title"
          ? first.idea.title.localeCompare(second.idea.title, "tr-TR")
          : sort === "oldest"
            ? first.idea.createdAt.localeCompare(second.idea.createdAt)
            : second.idea.createdAt.localeCompare(first.idea.createdAt),
      );
  }, [ideas, search, sort, statusFilter]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredIdeas.length / pageSize)));
  const pageIdeas = filteredIdeas.slice((safePage - 1) * pageSize, safePage * pageSize);

  const closeToast = useCallback(() => setFeedback(null), []);

  async function runBulkAction() {
    if (!user || !bulkAction || activeAction) return;
    const ids = [...selected];
    const successfulIds = new Set<string>();
    setBulkAction(null);
    let completed = 0;
    for (const ideaId of ids) {
      const result =
        bulkAction === "approve"
          ? await approveIdea(ideaId, user.id)
          : await rejectAdminIdea(ideaId, user.id);
      if (result.success) {
        completed += 1;
        successfulIds.add(ideaId);
      }
    }
    const status = bulkAction === "approve" ? "approved" : "rejected";
    setIdeas((current) =>
      current.map((item) =>
        successfulIds.has(item.idea.id)
          ? { ...item, idea: { ...item.idea, status } }
          : item,
      ),
    );
    setSelected(new Set());
    setFeedback({
      type: completed === ids.length ? "success" : "error",
      message: `${completed}/${ids.length} hayal ${
        bulkAction === "approve" ? "onaylandı" : "reddedildi"
      }.`,
    });
  }

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
    const unsubscribe = subscribeToUserAccessProfile(
      user.id,
      (profileResult) => {
        if (!active) return;
        void applyAccessProfile(user.id, profileResult);
      },
    );

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
    if (
      !window.confirm("Bu hayali kalıcı olarak silmek istediğine emin misin?")
    ) {
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
      <AdminToast toast={feedback} onClose={closeToast} />
      <ConfirmationDialog
        open={bulkAction !== null}
        title={`Seçili hayalleri ${bulkAction === "approve" ? "onayla" : "reddet"}`}
        description={`${selected.size} hayal için bu işlem uygulanacak.`}
        confirmLabel={bulkAction === "approve" ? "Onayla" : "Reddet"}
        destructive={bulkAction === "reject"}
        onCancel={() => setBulkAction(null)}
        onConfirm={() => void runBulkAction()}
      />
      {ideas.length > 0 && (
        <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2">
            <span className="sr-only">Hayal veya kullanıcı ara</span>
            <Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hayal veya kullanıcı ara" />
          </label>
          <Select aria-label="Duruma göre filtrele" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IdeaStatus | "all")}>
            <option value="all">Tüm durumlar</option>
            {Object.entries(IDEA_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select aria-label="Sırala" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="newest">En yeni</option>
            <option value="oldest">En eski</option>
            <option value="title">Başlığa göre</option>
          </Select>
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
            <Button disabled={selected.size === 0} onClick={() => setBulkAction("approve")}>Seçilenleri Onayla ({selected.size})</Button>
            <Button variant="secondary" className="border-red-200 text-red-700" disabled={selected.size === 0} onClick={() => setBulkAction("reject")}>Seçilenleri Reddet</Button>
            <Button variant="secondary" className="ml-auto" onClick={() => exportCsv("hayaller.csv", ["Başlık", "Kullanıcı", "Kategori", "Durum", "Tarih"], filteredIdeas.map(({ idea, userName }) => [idea.title, userName, idea.categoryId, IDEA_STATUS_LABELS[idea.status], idea.createdAt]))}>
              <Download aria-hidden="true" className="size-4" /> CSV
            </Button>
          </div>
        </div>
      )}
      {filteredIdeas.length === 0 ? (
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
          <p className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 md:hidden">
            Tüm sütunları görmek için tabloyu yatay kaydır.
          </p>
          <div
            className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-gutter:stable]"
            role="region"
            aria-label="Hayal yönetimi tablosu"
            tabIndex={0}
          >
            <table className="w-full min-w-4xl border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label="Bu sayfadaki bekleyen hayalleri seç"
                      checked={pageIdeas.some(({ idea }) => idea.status === "pending") && pageIdeas.filter(({ idea }) => idea.status === "pending").every(({ idea }) => selected.has(idea.id))}
                      onChange={(event) => setSelected((current) => {
                        const next = new Set(current);
                        for (const { idea } of pageIdeas) {
                          if (idea.status !== "pending") continue;
                          if (event.target.checked) next.add(idea.id);
                          else next.delete(idea.id);
                        }
                        return next;
                      })}
                    />
                  </th>
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
                {pageIdeas.map(({ idea, userName }) => (
                  <tr
                    key={idea.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <input type="checkbox" aria-label={`${idea.title} hayalini seç`} disabled={idea.status !== "pending"} checked={selected.has(idea.id)} onChange={(event) => setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(idea.id);
                        else next.delete(idea.id);
                        return next;
                      })} />
                    </td>
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
          <AdminPagination page={safePage} pageSize={pageSize} total={filteredIdeas.length} onPageChange={setPage} />
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
