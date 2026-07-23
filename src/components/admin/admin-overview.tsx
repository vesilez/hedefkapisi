"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
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
  ArrowRight,
  Clock3,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { AdminAnalyticsSection } from "./admin-analytics-charts";

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
        <Button
          className="mt-4"
          onClick={() => void loadStatistics(user.id)}
        >
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
          <Card key={label} className="p-5">
            <div className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
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
              className="flex min-h-12 items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
            >
              {link.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
