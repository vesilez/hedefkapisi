"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { IDEA_STATUS_LABELS } from "@/constants/idea-statuses";
import { isAdminRole, USER_ROLE_LABELS } from "@/constants/roles";
import { SUPPORT_REQUEST_STATUS_LABELS } from "@/constants/support-request-statuses";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import { useAuth } from "@/hooks/use-auth";
import { getProfileDashboard } from "@/services/profile-dashboard-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { ProfileDashboardData } from "@/types/profile-dashboard";
import {
  Bookmark,
  CheckCircle2,
  Heart,
  Lightbulb,
  MessageCircle,
  Pencil,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FavoriteIdeas } from "@/components/ideas";
import { ProfileForm } from "./profile-form";

const TABS = [
  "overview",
  "ideas",
  "favorites",
  "comments",
  "supports",
] as const;
type ProfileTab = (typeof TABS)[number];

const TAB_LABELS: Record<ProfileTab, string> = {
  overview: "Genel Bakış",
  ideas: "Hayallerim",
  favorites: "Favorilerim",
  comments: "Yorumlarım",
  supports: "Desteklerim",
};

type ViewState = "loading" | "ready" | "error";

export function ProfileDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [data, setData] = useState<ProfileDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [editingProfile, setEditingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(userId: string) {
    setState("loading");
    setError(null);
    const access = await getUserAccessProfile(userId);
    if (access.success && access.data && isAdminRole(access.data.role)) {
      router.replace("/admin");
      return;
    }

    const result = await getProfileDashboard(userId);
    if (result.success) {
      setData(result.data);
      setState("ready");
    } else {
      setError(result.error.message);
      setState("error");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getUserAccessProfile(user.id).then(async (access) => {
      if (!active) return;
      if (access.success && access.data && isAdminRole(access.data.role)) {
        router.replace("/admin");
        return;
      }

      const result = await getProfileDashboard(user.id);
      if (!active) return;
      if (result.success) {
        setData(result.data);
        setState("ready");
      } else {
        setError(result.error.message);
        setState("error");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  if (authLoading || state === "loading") {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
        <LoadingSpinner label="Profil faaliyetleri yükleniyor..." />
      </div>
    );
  }

  if (!user) return null;

  if (state === "error" || !data) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          {error ?? "Profil faaliyetleri yüklenemedi."}
        </p>
        <Button className="mt-4" onClick={() => void load(user.id)}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ProfileSummary
        data={data}
        editing={editingProfile}
        onToggleEditing={() => setEditingProfile((current) => !current)}
      />

      {editingProfile && (
        <section id="profil-duzenle" className="mt-6">
          <h2 className="mb-4 text-2xl font-bold text-slate-950">
            Profil bilgilerini düzenle
          </h2>
          <ProfileForm />
        </section>
      )}

      <div className="mt-8 overflow-x-auto">
        <div
          className="flex min-w-max gap-2 border-b border-slate-200"
          role="tablist"
          aria-label="Profil bölümleri"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "border-blue-700 text-blue-800"
                  : "border-transparent text-slate-600 hover:text-slate-950"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "ideas" && <IdeasTab data={data} />}
        {activeTab === "favorites" && <FavoriteIdeas />}
        {activeTab === "comments" && <CommentsTab data={data} />}
        {activeTab === "supports" && <SupportsTab data={data} />}
      </div>
    </div>
  );
}

function ProfileSummary({
  data,
  editing,
  onToggleEditing,
}: {
  data: ProfileDashboardData;
  editing: boolean;
  onToggleEditing: () => void;
}) {
  const { profile } = data;
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-950">
              {profile.name} {profile.surname}
            </h2>
            <Badge>{USER_ROLE_LABELS[profile.role]}</Badge>
            <Badge
              className={
                profile.profileCompleted
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }
            >
              {profile.profileCompleted ? "Profil tamamlandı" : "Profil eksik"}
            </Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <SummaryField label="E-posta">{profile.email}</SummaryField>
            <SummaryField label="Rol">
              {USER_ROLE_LABELS[profile.role]}
            </SummaryField>
            <SummaryField label="Kayıt tarihi">
              {formatDate(profile.createdAt)}
            </SummaryField>
          </dl>
        </div>
        <Button variant="secondary" onClick={onToggleEditing}>
          <Pencil aria-hidden="true" className="mr-2 size-4" />
          {editing ? "Düzenlemeyi Kapat" : "Profil Bilgilerini Düzenle"}
        </Button>
      </div>
    </Card>
  );
}

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className="mt-1 break-words text-slate-600">{children}</dd>
    </div>
  );
}

function OverviewTab({ data }: { data: ProfileDashboardData }) {
  const cards = [
    {
      label: "Paylaşılan hayal",
      value: data.statistics.sharedIdeas,
      icon: Lightbulb,
    },
    {
      label: "Onaylanan hayal",
      value: data.statistics.approvedIdeas,
      icon: CheckCircle2,
    },
    {
      label: "Favori",
      value: data.statistics.favorites,
      icon: Bookmark,
    },
    {
      label: "Yapılan yorum",
      value: data.statistics.comments,
      icon: MessageCircle,
    },
    {
      label: "Destek başvurusu",
      value: data.statistics.supportRequests,
      icon: Send,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="p-5">
          <Icon aria-hidden="true" className="size-6 text-blue-700" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
        </Card>
      ))}
    </div>
  );
}

function IdeasTab({ data }: { data: ProfileDashboardData }) {
  if (data.ideas.length === 0) {
    return (
      <EmptyState
        title="Henüz hayal paylaşmadın"
        description="İlk hayalini paylaşarak faaliyetlerini burada görebilirsin."
        icon={Lightbulb}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {data.ideas.map((idea) => (
        <Card key={idea.id} className="p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-950">
                  {idea.title}
                </h3>
                <IdeaStatusBadge status={idea.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>{formatDate(idea.createdAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Heart aria-hidden="true" className="size-4" />
                  {idea.likeCount} beğeni
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(idea.status === "draft" ||
                idea.status === "revision_requested") && (
                <LinkButton href={`/fikirlerim/${idea.id}/duzenle`}>
                  Düzenle
                </LinkButton>
              )}
              {idea.status === "approved" && (
                <LinkButton href={`/hayaller/${idea.slug}`}>
                  Hayal Detayına Git
                </LinkButton>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CommentsTab({ data }: { data: ProfileDashboardData }) {
  if (data.comments.length === 0) {
    return (
      <EmptyState
        title="Henüz yorum yapmadın"
        description="Hayallere yaptığın yorumlar burada görüntülenecek."
        icon={MessageCircle}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {data.comments.map((comment) => (
        <Card key={comment.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{comment.ideaTitle}</h3>
            {comment.status === "hidden" && (
              <Badge className="bg-amber-100 text-amber-800">Gizlendi</Badge>
            )}
          </div>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
            {comment.content}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {formatDate(comment.createdAt)}
            </span>
            {comment.ideaSlug && (
              <LinkButton href={`/hayaller/${comment.ideaSlug}`}>
                Hayal Detayına Git
              </LinkButton>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SupportsTab({ data }: { data: ProfileDashboardData }) {
  if (data.supportRequests.length === 0) {
    return (
      <EmptyState
        title={
          data.profile.role === "student"
            ? "Öğrenci hesaplarında destek başvurusu bulunmaz"
            : "Henüz destek başvurun yok"
        }
        description={
          data.profile.role === "student"
            ? "Destek başvuruları supporter ve mentor hesapları tarafından gönderilebilir."
            : "Gönderdiğin destek başvuruları burada görüntülenecek."
        }
        icon={Send}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {data.supportRequests.map((request) => (
        <Card key={request.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{request.ideaTitle}</h3>
            <Badge>
              {SUPPORT_REQUEST_STATUS_LABELS[request.status]}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {request.supportTypes
              .map((type) => SUPPORT_TYPE_LABELS[type])
              .join(", ")}
          </p>
          {request.adminNote && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Yönetici notu
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                {request.adminNote}
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {formatDate(request.createdAt)}
            </span>
            {request.ideaSlug && (
              <LinkButton href={`/hayaller/${request.ideaSlug}`}>
                Hayal Detayına Git
              </LinkButton>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
    >
      {children}
    </Link>
  );
}

function IdeaStatusBadge({
  status,
}: {
  status: ProfileDashboardData["ideas"][number]["status"];
}) {
  const tone =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "rejected"
        ? "bg-red-100 text-red-800"
        : status === "pending"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-700";
  return <Badge className={tone}>{IDEA_STATUS_LABELS[status]}</Badge>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
