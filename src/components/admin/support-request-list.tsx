"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { isAdminRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import { getPendingSupportRequests } from "@/services/support-request-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { SupportRequest } from "@/types/support-request";
import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupportRequestCard } from "./support-request-card";

type ViewState = "loading" | "ready" | "forbidden" | "profile-error" | "list-error";

export function SupportRequestList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    const requestsResult = await getPendingSupportRequests();
    if (requestsResult.success) {
      setRequests(requestsResult.data);
      setState("ready");
    } else {
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
      const result = await getPendingSupportRequests();
      if (!active) return;
      if (result.success) {
        setRequests(result.data);
        setState("ready");
      } else {
        setState("list-error");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  function removeReviewed(requestId: string, message: string) {
    setRequests((current) => current.filter((item) => item.id !== requestId));
    setFeedback(message);
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
        <p className="font-semibold text-red-800">{state === "profile-error" ? "Kullanıcı profili yüklenemedi." : "Destek başvuruları yüklenemedi."}</p>
        <Button className="mt-4" onClick={() => void load(user.id)}>Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div>
      {feedback && <p className="mb-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800" aria-live="polite">{feedback}</p>}
      {requests.length === 0 ? (
        <EmptyState title="Bekleyen destek başvurusu yok" description="Yeni başvurular burada görüntülenecek." icon={Inbox} />
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => <SupportRequestCard key={request.id} request={request} adminId={user.id} onReviewed={removeReviewed} />)}
        </div>
      )}
    </div>
  );
}
