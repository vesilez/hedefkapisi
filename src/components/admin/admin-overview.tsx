"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { getRecentAdminActivities } from "@/services/admin-analytics-service";
import {
  getAdminIdeaStatistics,
  type AdminIdeaStatistics,
} from "@/services/idea-service";
import {
  getAdminSupportRequestStatistics,
  type AdminSupportRequestStatistics,
} from "@/services/support-request-service";
import {
  getAdminUserStatistics,
  type AdminUserStatistics,
} from "@/services/user-service";
import {
  type AdminActivity,
  type AdminActivityType,
} from "@/types/admin-analytics";
import {
  ArrowRight,
  Building2,
  Clock3,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  UserPlus,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { MatchingAnalytics } from "./matching-analytics";

const AdminAnalyticsSection = dynamic(
  () =>
    import("./admin-analytics-charts").then(
      (module) => module.AdminAnalyticsSection,
    ),
  {
    loading: () => (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Grafikler yükleniyor..." />
      </div>
    ),
  },
);

interface DashboardStatistics {
  users: AdminUserStatistics;
  ideas: AdminIdeaStatistics;
  supportRequests: AdminSupportRequestStatistics;
}

type ViewState = "loading" | "ready" | "error";

export function AdminOverview() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [activityState, setActivityState] = useState<ViewState>("loading");
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);

  async function loadActivities(adminId: string) {
    setActivityState("loading");
    setActivityError(null);
    const result = await getRecentAdminActivities(adminId);
    if (result.success) {
      setActivities(result.data);
      setActivityState("ready");
    } else {
      setActivityError(result.error.message);
      setActivityState("error");
    }
  }

  async function loadStatistics(adminId: string) {
    setState("loading");
    setError(null);
    const [users, ideas, supportRequests] = await Promise.all([
      getAdminUserStatistics(adminId),
      getAdminIdeaStatistics(adminId),
      getAdminSupportRequestStatistics(adminId),
    ]);

    if (!users.success || !ideas.success || !supportRequests.success) {
      const message =
        (!users.success && users.error.message) ||
        (!ideas.success && ideas.error.message) ||
        (!supportRequests.success && supportRequests.error.message) ||
        "İstatistikler şu anda yüklenemiyor.";
      setError(message);
      setState("error");
      return;
    }

    setStatistics({
      users: users.data,
      ideas: ideas.data,
      supportRequests: supportRequests.data,
    });
    setState("ready");
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getRecentAdminActivities(user.id).then((result) => {
      if (!active) return;
      if (result.success) {
        setActivities(result.data);
        setActivityState("ready");
      } else {
        setActivityError(result.error.message);
        setActivityState("error");
      }
    });
    void Promise.all([
      getAdminUserStatistics(user.id),
      getAdminIdeaStatistics(user.id),
      getAdminSupportRequestStatistics(user.id),
    ]).then(([users, ideas, supportRequests]) => {
      if (!active) return;

      if (!users.success || !ideas.success || !supportRequests.success) {
        const message =
          (!users.success && users.error.message) ||
          (!ideas.success && ideas.error.message) ||
          (!supportRequests.success && supportRequests.error.message) ||
          "İstatistikler şu anda yüklenemiyor.";
        setError(message);
        setState("error");
        return;
      }

      setStatistics({
        users: users.data,
        ideas: ideas.data,
        supportRequests: supportRequests.data,
      });
      setState("ready");
    });

    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  if (authLoading || state === "loading") {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
        <LoadingSpinner label="Dashboard verileri yükleniyor..." />
      </div>
    );
  }

  if (!user) return null;

  if (state === "error" || !statistics) {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          {error ?? "Dashboard verileri yüklenemedi."}
        </p>
        <Button className="mt-4" onClick={() => void loadStatistics(user.id)}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const cards: Array<{
    label: string;
    value: number;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    tone: string;
  }> = [
    {
      label: "Toplam kullanıcı",
      value: statistics.users.total,
      icon: Users,
      tone: "bg-blue-100 text-blue-700",
    },
    {
      label: "Öğrenci",
      value: statistics.users.students,
      icon: GraduationCap,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Destekçi",
      value: statistics.users.supporters,
      icon: HandHeart,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Mentor",
      value: statistics.users.mentors,
      icon: UserRoundCheck,
      tone: "bg-cyan-100 text-cyan-700",
    },
    {
      label: "Sponsor",
      value: statistics.users.sponsors,
      icon: Building2,
      tone: "bg-pink-100 text-pink-700",
    },
    {
      label: "Toplam hayal",
      value: statistics.ideas.total,
      icon: Lightbulb,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      label: "Onay bekleyen hayal",
      value: statistics.ideas.pending,
      icon: Clock3,
      tone: "bg-orange-100 text-orange-700",
    },
    {
      label: "Onaylanan hayal",
      value: statistics.ideas.approved,
      icon: UserRoundCheck,
      tone: "bg-green-100 text-green-700",
    },
    {
      label: "Toplam destek başvurusu",
      value: statistics.supportRequests.total,
      icon: HandHeart,
      tone: "bg-teal-100 text-teal-700",
    },
    {
      label: "Bekleyen destek başvurusu",
      value: statistics.supportRequests.pending,
      icon: HandHeart,
      tone: "bg-rose-100 text-rose-700",
    },
    {
      label: "Son 7 günde eklenen hayal",
      value: statistics.ideas.addedLastSevenDays,
      icon: Sparkles,
      tone: "bg-fuchsia-100 text-fuchsia-700",
    },
    {
      label: "Son 30 gün yeni kullanıcı",
      value: statistics.users.addedLastThirtyDays,
      icon: UserPlus,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Son 30 gün yeni hayal",
      value: statistics.ideas.addedLastThirtyDays,
      icon: Sparkles,
      tone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Son 30 gün destek başvurusu",
      value: statistics.supportRequests.addedLastThirtyDays,
      icon: HandHeart,
      tone: "bg-lime-100 text-lime-700",
    },
  ];

  const hasData = cards.some((card) => card.value > 0);

  return (
    <div>
      {!hasData && (
        <EmptyState
          className="mb-6"
          title="Henüz platform verisi yok"
          description="Kullanıcılar, hayaller ve destek başvuruları eklendikçe istatistikler burada görünecek."
          icon={LayoutDashboard}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <div
              className={`flex size-11 items-center justify-center rounded-xl ${tone}`}
            >
              <Icon aria-hidden={true} className="size-5" />
            </div>
            <p className="mt-5 text-3xl font-extrabold text-slate-950">
              {new Intl.NumberFormat("tr-TR").format(value)}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
          </Card>
        ))}
      </div>

      <AdminAnalyticsSection adminId={user.id} />

      <MatchingAnalytics adminId={user.id} />

      <RecentActivitiesSection
        state={activityState}
        activities={activities}
        error={activityError}
        onRetry={() => void loadActivities(user.id)}
      />

      <Card className="mt-8">
        <h2 className="text-xl font-bold text-slate-950">Hızlı işlemler</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/hayaller", label: "Hayallere Git" },
            { href: "/admin/kullanicilar", label: "Kullanıcılara Git" },
            {
              href: "/admin/destek-basvurulari",
              label: "Destek Başvurularına Git",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-blue-700"
            >
              {link.label}
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

const ACTIVITY_PRESENTATION: Record<
  AdminActivityType,
  {
    label: string;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    tone: string;
  }
> = {
  idea_created: {
    label: "Yeni hayal",
    icon: Lightbulb,
    tone: "bg-amber-100 text-amber-700",
  },
  support_requested: {
    label: "Destek başvurusu",
    icon: HandHeart,
    tone: "bg-rose-100 text-rose-700",
  },
  user_registered: {
    label: "Yeni kullanıcı",
    icon: UserPlus,
    tone: "bg-blue-100 text-blue-700",
  },
  comment_created: {
    label: "Yeni yorum",
    icon: MessageSquareText,
    tone: "bg-violet-100 text-violet-700",
  },
};

function formatActivityDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RecentActivitiesSection({
  state,
  activities,
  error,
  onRetry,
}: {
  state: ViewState;
  activities: AdminActivity[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Card className="mt-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-950">Son Aktiviteler</h2>
        <p className="mt-1 text-sm text-slate-600">
          Platformdaki en güncel kullanıcı hareketleri.
        </p>
      </div>

      {state === "loading" ? (
        <LoadingSpinner
          className="mx-auto px-0"
          label="Son aktiviteler yükleniyor..."
        />
      ) : state === "error" ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
          role="alert"
        >
          <p className="text-sm font-semibold text-red-800">
            {error ?? "Son aktiviteler yüklenemedi."}
          </p>
          <Button className="mt-4" onClick={onRetry}>
            Tekrar Dene
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          className="py-8"
          title="Henüz aktivite yok"
          description="Yeni hayaller, destek başvuruları, kullanıcılar ve yorumlar burada görünecek."
          icon={Clock3}
        />
      ) : (
        <ol className="divide-y divide-slate-100">
          {activities.map((activity) => {
            const presentation = ACTIVITY_PRESENTATION[activity.type];
            const Icon = presentation.icon;
            return (
              <li
                key={activity.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${presentation.tone}`}
                >
                  <Icon aria-hidden={true} className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      {presentation.label}
                    </span>
                    <time className="text-xs text-slate-500">
                      {formatActivityDate(activity.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">
                      {activity.userName}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{activity.relatedTitle}</span>
                  </p>
                </div>
                <Link
                  href={activity.href}
                  className="inline-flex min-h-10 items-center gap-2 justify-self-start rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 sm:justify-self-end"
                >
                  İlgili sayfaya git
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
