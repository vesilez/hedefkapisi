"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { USER_ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import { getLeaderboard } from "@/services/leaderboard-service";
import type {
  LeaderboardData,
  RankedLeaderboardEntry,
} from "@/types/leaderboard";
import { Crown, Medal, RotateCcw, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function LeaderboardTable() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getLeaderboard();
    if (result.success) setData(result.data);
    else setError(result.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    void getLeaderboard().then((result) => {
      if (!active) return;
      if (result.success) setData(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoadingSpinner label="Liderlik tablosu yükleniyor..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 text-center">
        <p className="font-semibold text-red-800" role="alert">
          {error}
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => void load()}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Yeniden dene
        </Button>
      </Card>
    );
  }

  if (!data || data.topUsers.length === 0) {
    return (
      <EmptyState
        title="Liderlik tablosu henüz oluşmadı"
        description="Platformdaki etkinlikler puana dönüştükçe ilk sıralamalar burada görünecek."
        icon={Trophy}
      />
    );
  }

  const currentUserOutsideTop =
    data.currentUser &&
    !data.topUsers.some((entry) => entry.userId === data.currentUser?.userId)
      ? data.currentUser
      : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="hidden grid-cols-[5rem_1fr_9rem_8rem_8rem] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
          <span>Sıra</span>
          <span>Kullanıcı</span>
          <span>Rol</span>
          <span className="text-right">Rozet</span>
          <span className="text-right">Puan</span>
        </div>
        <ol className="divide-y divide-slate-200">
          {data.topUsers.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={entry.userId === user?.id}
            />
          ))}
        </ol>
      </Card>

      {currentUserOutsideTop && (
        <section aria-labelledby="my-ranking-title">
          <h2
            id="my-ranking-title"
            className="mb-3 text-lg font-bold text-slate-950"
          >
            Senin sıran
          </h2>
          <Card className="overflow-hidden border-blue-300 bg-blue-50 p-0">
            <ol>
              <LeaderboardRow entry={currentUserOutsideTop} isCurrentUser />
            </ol>
          </Card>
        </section>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: RankedLeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const medal = MEDALS[entry.rank - 1];
  const initials =
    `${entry.name.charAt(0)}${entry.surname.charAt(0)}`.toLocaleUpperCase(
      "tr-TR",
    ) || "HK";

  return (
    <li
      className={`grid gap-4 px-4 py-5 sm:px-6 md:grid-cols-[5rem_1fr_9rem_8rem_8rem] md:items-center ${
        isCurrentUser ? "bg-blue-50" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Sıralama
        </span>
        <span className="inline-flex items-center gap-2 text-xl font-black text-slate-900">
          {medal ? (
            <span aria-label={`${entry.rank}. sıra`}>{medal}</span>
          ) : (
            <>#{entry.rank}</>
          )}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-100 bg-cover bg-center font-black text-blue-800 ring-2 ring-white"
          style={
            entry.avatarUrl
              ? { backgroundImage: `url("${entry.avatarUrl}")` }
              : undefined
          }
        >
          {!entry.avatarUrl && initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-950">
            {entry.name} {entry.surname}
          </p>
          {isCurrentUser && (
            <Badge className="mt-1 bg-blue-100 text-blue-800">Sen</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Rol
        </span>
        <Badge>{USER_ROLE_LABELS[entry.role]}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm font-bold text-slate-700 md:justify-end">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Rozet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Medal aria-hidden="true" className="size-4 text-amber-600" />
          {entry.achievementCount}
        </span>
      </div>
      <div className="flex items-center justify-between md:justify-end">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Toplam puan
        </span>
        <span className="inline-flex items-center gap-1.5 text-lg font-black text-blue-800">
          <Crown aria-hidden="true" className="size-5 text-amber-500" />
          {entry.score}
        </span>
      </div>
    </li>
  );
}
