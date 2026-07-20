"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { isAdminRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import { getPendingIdeas } from "@/services/idea-service";
import {
  getUserAccessProfile,
  subscribeToUserAccessProfile,
  type UserServiceResult,
  type UserAccessProfile,
} from "@/services/user-service";
import type { Idea } from "@/types/idea";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IdeaModerationCard } from "./idea-moderation-card";

type ViewState =
  | "loading"
  | "ready"
  | "forbidden"
  | "profile-error"
  | "ideas-error";

interface AccessDiagnosticsProps {
  uid: string | null;
  profileFound: boolean | null;
  role: string | null;
  loading: boolean;
  error: string | null;
}

function AccessDiagnostics(props: AccessDiagnosticsProps) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <dl className="mb-5 grid gap-1 rounded-xl border border-amber-300 bg-amber-50 p-4 font-mono text-xs text-amber-950">
      <div>auth user uid: {props.uid ?? "yok"}</div>
      <div>
        kullanıcı profili bulundu mu:{" "}
        {props.profileFound === null
          ? "henüz bilinmiyor"
          : props.profileFound
            ? "evet"
            : "hayır"}
      </div>
      <div>Firestore role: {props.role ?? "okunmadı"}</div>
      <div>profile loading: {props.loading ? "true" : "false"}</div>
      <div>profile error: {props.error ?? "yok"}</div>
    </dl>
  );
}

export function IdeaModerationList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [profileFound, setProfileFound] = useState<boolean | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadAdminIdeas(userId: string) {
    setState("loading");
    setProfileLoading(true);
    setProfileError(null);
    const profileResult = await getUserAccessProfile(userId);

    await applyAccessProfile(userId, profileResult);
  }

  async function applyAccessProfile(
    userId: string,
    profileResult: UserServiceResult<UserAccessProfile | null>,
  ) {
    setState("loading");
    setAccessUserId(userId);
    setProfileLoading(false);

    if (!profileResult.success) {
      setProfileFound(null);
      setProfileRole(null);
      setProfileError(profileResult.error.message);
      setState("profile-error");
      return;
    }

    setProfileFound(profileResult.data !== null);
    setProfileRole(profileResult.data?.role ?? null);
    setProfileError(null);

    if (!profileResult.data) {
      setState("profile-error");
      return;
    }

    if (!isAdminRole(profileResult.data.role)) {
      setState("forbidden");
      return;
    }

    const ideasResult = await getPendingIdeas();
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
    await loadAdminIdeas(user.id);
  }

  function removeModeratedIdea(ideaId: string, message: string) {
    setIdeas((currentIdeas) =>
      currentIdeas.filter((idea) => idea.id !== ideaId),
    );
    setFeedback(message);
  }

  const diagnostics = (
    <AccessDiagnostics
      uid={user?.id ?? null}
      profileFound={profileFound}
      role={profileRole}
      loading={
        authLoading ||
        profileLoading ||
        (user !== null && accessUserId !== user.id)
      }
      error={profileError}
    />
  );

  if (
    authLoading ||
    state === "loading" ||
    (user !== null && accessUserId !== user.id)
  ) {
    return (
      <div>
        {diagnostics}
        <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
          <LoadingSpinner label="Fikirler yükleniyor..." />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (state === "forbidden") {
    return (
      <div>
        {diagnostics}
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          role="alert"
        >
          Bu alana erişim yetkin yok.
        </div>
      </div>
    );
  }

  if (state === "profile-error") {
    return (
      <div>
        {diagnostics}
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
      </div>
    );
  }

  if (state === "ideas-error") {
    return (
      <div>
        {diagnostics}
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
      </div>
    );
  }

  return (
    <div>
      {diagnostics}
      {feedback && (
        <p
          className="mb-5 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      )}
      {ideas.length === 0 ? (
        <div>
          <EmptyState
            title="Onay bekleyen fikir yok"
            description="Yeni gönderilen fikirler burada görüntülenecek."
            icon={ClipboardCheck}
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
        <div className="grid gap-6">
          {ideas.map((idea) => (
            <IdeaModerationCard
              key={idea.id}
              idea={idea}
              adminId={user.id}
              onModerated={removeModeratedIdea}
            />
          ))}
        </div>
      )}
    </div>
  );
}
