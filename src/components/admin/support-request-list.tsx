"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { isAdminRole } from "@/constants/roles";
import type { SupportRequestStatus } from "@/constants/support-request-statuses";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminSupportRequests,
  type AdminSupportRequestListItem,
} from "@/services/support-request-service";
import { getUserAccessProfile } from "@/services/user-service";
import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          statusFilter === "all" || item.request.status === statusFilter,
      ),
    [requests, statusFilter],
  );

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
      <div className="mb-6 max-w-xs">
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
          {filteredRequests.map((item) => (
            <SupportRequestCard
              key={item.request.id}
              item={item}
              adminId={user.id}
              onReviewed={updateReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
