import { LeaderboardTable } from "@/components/leaderboard";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { LEADERBOARD_POINTS } from "@/constants/leaderboard";
import { createPageMetadata } from "@/lib/seo";
import { MessageCircle, Rocket, ThumbsUp, Trophy, Users } from "lucide-react";

export const metadata = createPageMetadata({
  title: "Liderlik Tablosu",
  description:
    "Hedef Kapısı topluluğunda hayalleri ve desteğiyle öne çıkan kullanıcıları keşfet.",
  path: "/liderlik",
});

const scoreItems = [
  {
    label: "Hayal paylaşma",
    points: LEADERBOARD_POINTS.dreamShared,
    icon: Rocket,
  },
  {
    label: "Hayale destek verme",
    points: LEADERBOARD_POINTS.supportGiven,
    icon: Users,
  },
  {
    label: "Yorum yapma",
    points: LEADERBOARD_POINTS.commentCreated,
    icon: MessageCircle,
  },
  {
    label: "Alınan beğeni",
    points: LEADERBOARD_POINTS.likeReceived,
    icon: ThumbsUp,
  },
  {
    label: "Tamamlanan destek",
    points: LEADERBOARD_POINTS.supportCompleted,
    icon: Trophy,
  },
] as const;

export default function LeaderboardPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 shadow-sm sm:p-9">
        <Badge className="bg-amber-100 text-amber-800">
          Topluluk sıralaması
        </Badge>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
          Liderlik Tablosu
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Hayal paylaşan, destek olan ve topluluğa katkı sağlayan kullanıcıların
          ilk 20 sıralaması.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {scoreItems.map(({ label, points, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm"
            >
              <Icon aria-hidden="true" className="size-5 text-blue-700" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                {label}
              </p>
              <p className="mt-1 text-xl font-black text-blue-800">
                +{points} puan
              </p>
            </div>
          ))}
        </div>
      </header>

      <section className="mt-8" aria-label="Kullanıcı sıralaması">
        <LeaderboardTable />
      </section>
    </PageContainer>
  );
}
