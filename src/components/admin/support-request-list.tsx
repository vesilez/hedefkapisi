"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AdminPagination,
  AdminToast,
  ConfirmationDialog,
} from "./admin-table-tools";
import { exportCsv } from "@/lib/utils/export-csv";
import { isAdminRole } from "@/constants/roles";
import type { SupportRequestStatus } from "@/constants/support-request-statuses";
import type { SupportApplicationType } from "@/types/support-request";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminSupportRequests,
  approveSupportRequest,
  rejectSupportRequest,
  type AdminSupportRequestListItem,
} from "@/services/support-request-service";
import { getUserAccessProfile } from "@/services/user-service";
import { Download, Inbox, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SupportRequestCard } from "./support-request-card";

type ViewState = "loading" | "ready" | "forbidden" | "profile-error" | "list-error";

export function SupportRequestList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<AdminSupportRequestListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    SupportRequestStatus | "all"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    SupportApplicationType | "all"
  >("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const pageSize = 8;

  async function load(userId: string) {
    const profileResult = await getUserAccessProfile(userId);
    setCheckedUserId(userId);
    if (!profileResult.success || !profileResult.data) {
      setState("profile-error");
      return;
    }
    if (!isAdminRole(profileResult.data.role)) {
      setState("forbidden");
      return;
    }
    const requestsResult = await getAdminSupportRequests(userId);
    if (requestsResult.success) {
      setRequests(requestsResult.data);
      setState("ready");
    } else {
      setFeedback({ type: "error", message: requestsResult.error.message });
      setState("list-error");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }
    let active = true;
    void getUserAccessProfile(user.id).then(async (profileResult) => {
      if (!active) return;
      setCheckedUserId(user.id);
      if (!profileResult.success || !profileResult.data) {
        setState("profile-error");
        return;
      }
      if (!isAdminRole(profileResult.data.role)) {
        setState("forbidden");
        return;
      }
      const result = await getAdminSupportRequests(user.id);
      if (!active) return;
      if (result.success) {
        setRequests(result.data);
        setState("ready");
      } else {
        setFeedback({ type: "error", message: result.error.message });
        setState("list-error");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  function updateReviewed(
    requestId: string,
    status: Extract<SupportRequestStatus, "approved" | "rejected">,
    adminNote: string,
    message: string,
  ) {
    setRequests((current) =>
      current.map((item) =>
        item.request.id === requestId
          ? {
              ...item,
              request: { ...item.request, status, adminNote },
            }
          : item,
      ),
    );
    setFeedback({ type: "success", message });
  }

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return requests
      .filter(
        (item) =>
          (statusFilter === "all" || item.request.status === statusFilter) &&
          (typeFilter === "all" ||
            item.request.applicationType === typeFilter) &&
          (!term ||
            item.applicantName.toLocaleLowerCase("tr-TR").includes(term) ||
            item.applicantEmail.toLocaleLowerCase("tr-TR").includes(term) ||
            item.request.message.toLocaleLowerCase("tr-TR").includes(term)),
      )
      .sort((first, second) =>
        sort === "oldest"
          ? first.request.createdAt.localeCompare(second.request.createdAt)
          : second.request.createdAt.localeCompare(first.request.createdAt),
      );
  }, [requests, search, sort, statusFilter, typeFilter]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredRequests.length / pageSize)));
  const pageRequests = filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize);
  const closeToast = useCallback(() => setFeedback(null), []);

  async function runBulkAction() {
    if (!user || !bulkAction || bulkBusy) return;
    const action = bulkAction;
    const ids = [...selected];
    const successfulIds = new Set<string>();
    setBulkAction(null);
    setBulkBusy(true);
    let completed = 0;
    for (const requestId of ids) {
      const result =
        action === "approve"
          ? await approveSupportRequest(requestId, user.id, "Toplu yönetici onayı.")
          : await rejectSupportRequest(requestId, user.id, "Toplu yönetici reddi.");
      if (result.success) {
        completed += 1;
        successfulIds.add(requestId);
      }
    }
    const status = action === "approve" ? "approved" : "rejected";
    setRequests((current) =>
      current.map((item) =>
        successfulIds.has(item.request.id)
          ? { ...item, request: { ...item.request, status, adminNote: `Toplu yönetici ${action === "approve" ? "onayı" : "reddi"}.` } }
          : item,
      ),
    );
    setSelected(new Set());
    setBulkBusy(false);
    setFeedback({
      type: completed === ids.length ? "success" : "error",
      message: `${completed}/${ids.length} destek başvurusu ${
        action === "approve" ? "onaylandı" : "reddedildi"
      }.`,
    });
  }

  if (authLoading || state === "loading" || (user && checkedUserId !== user.id)) {
    return <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white"><LoadingSpinner label="Destek başvuruları yükleniyor..." /></div>;
  }
  if (!user) return null;
  if (state === "forbidden") {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" role="alert">Bu alana erişim yetkin yok.</div>;
  }
  if (state === "profile-error" || state === "list-error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="font-semibold text-red-800">{state === "profile-error" ? "Kullanıcı profili yüklenemedi." : feedback?.message ?? "Destek başvuruları yüklenemedi."}</p>
        <Button className="mt-4" onClick={() => void load(user.id)}>Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div>
      <AdminToast toast={feedback} onClose={closeToast} />
      <ConfirmationDialog
        open={bulkAction !== null}
        title={`Seçili başvuruları ${bulkAction === "approve" ? "onayla" : "reddet"}`}
        description={`${selected.size} başvuru için bu işlem uygulanacak. Her başvuru bağımsız işlenecek.`}
        confirmLabel={bulkAction === "approve" ? "Onayla" : "Reddet"}
        destructive={bulkAction === "reject"}
        onCancel={() => setBulkAction(null)}
        onConfirm={() => void runBulkAction()}
      />
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <label className="relative md:col-span-2">
          <span className="sr-only">Başvuru ara</span>
          <Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-400" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="İsim, e-posta veya mesaj ara" />
        </label>
        <div>
        <label htmlFor="support-request-status" className="sr-only">
          Duruma göre filtrele
        </label>
        <Select
          id="support-request-status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as SupportRequestStatus | "all",
            )
          }
        >
          <option value="all">Tüm durumlar</option>
          <option value="pending">Onay Bekliyor</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
        </Select>
        </div>
        <Select
          aria-label="Başvuru türüne göre filtrele"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value as SupportApplicationType | "all",
            )
          }
        >
          <option value="all">Tüm başvuru türleri</option>
          <option value="support">Destek</option>
          <option value="mentorship">Mentorluk</option>
          <option value="sponsorship">Sponsorluk teklifleri</option>
        </Select>
        <Select aria-label="Başvuruları sırala" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
        </Select>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
          <Button disabled={selected.size === 0 || bulkBusy} onClick={() => setBulkAction("approve")}>Seçilenleri Onayla ({selected.size})</Button>
          <Button variant="secondary" className="border-red-200 text-red-700" disabled={selected.size === 0 || bulkBusy} onClick={() => setBulkAction("reject")}>Seçilenleri Reddet</Button>
          <Button variant="secondary" className="ml-auto" onClick={() => exportCsv("destek-basvurulari.csv", ["Başvuru Sahibi", "E-posta", "Durum", "Tarih", "Mesaj"], filteredRequests.map((item) => [item.applicantName, item.applicantEmail, item.request.status, item.request.createdAt, item.request.message]))}>
            <Download aria-hidden="true" className="size-4" /> CSV
          </Button>
        </div>
      </div>
      {filteredRequests.length === 0 ? (
        <EmptyState
          title={
            requests.length === 0
              ? "Henüz destek başvurusu yok"
              : "Bu durumda başvuru yok"
          }
          description={
            requests.length === 0
              ? "Yeni başvurular burada görüntülenecek."
              : "Başka bir durum filtresi seçmeyi deneyin."
          }
          icon={Inbox}
        />
      ) : (
        <div className="grid gap-6">
          {pageRequests.map((item) => (
            <div key={item.request.id} className="relative">
              {item.request.status === "pending" && (
                <label className="mb-2 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={selected.has(item.request.id)} onChange={(event) => setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(item.request.id);
                    else next.delete(item.request.id);
                    return next;
                  })} />
                  Toplu işlem için seç
                </label>
              )}
              <SupportRequestCard item={item} adminId={user.id} onReviewed={updateReviewed} />
            </div>
          ))}
          <AdminPagination page={safePage} pageSize={pageSize} total={filteredRequests.length} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
