"use client";

import { IdeaCard } from "@/components/ideas/idea-card";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { getPublicIdeas } from "@/services/idea-service";
import type { IdeaListItem } from "@/types/idea";
import {
  HandHeart,
  Lightbulb,
  Radio,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const DISCOVERY_TABS = [
  { id: "newest", label: "Yeni Eklenenler" },
  { id: "liked", label: "En Çok Beğenilenler" },
  { id: "trending", label: "Trend Hayaller" },
] as const;

type DiscoveryTab = (typeof DISCOVERY_TABS)[number]["id"];

interface Statistic {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

function sortIdeas(ideas: IdeaListItem[], tab: DiscoveryTab): IdeaListItem[] {
  return [...ideas]
    .sort((first, second) => {
      if (tab === "newest") {
        return second.createdAt.localeCompare(first.createdAt);
      }
      if (tab === "liked") return second.likeCount - first.likeCount;

      const firstScore =
        first.likeCount * 2 + first.supportCount * 3 + first.commentCount;
      const secondScore =
        second.likeCount * 2 + second.supportCount * 3 + second.commentCount;
      return secondScore - firstScore;
    })
    .slice(0, 3);
}

export function HomePlatform() {
  const [ideas, setIdeas] = useState<IdeaListItem[]>([]);
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("newest");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void getPublicIdeas().then((result) => {
      if (!active) return;
      if (result.success) {
        setIdeas(result.data);
        setState("ready");
      } else {
        setState("error");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const featuredIdeas = useMemo(
    () => sortIdeas(ideas, activeTab),
    [activeTab, ideas],
  );
  const totalSupports = ideas.reduce(
    (total, idea) => total + idea.supportCount,
    0,
  );
  const statistics: Statistic[] = [
    {
      label: "Toplam Hayal",
      value: new Intl.NumberFormat("tr-TR").format(ideas.length),
      description: "Topluluğa açık hayaller",
      icon: Lightbulb,
    },
    {
      label: "Toplam Kullanıcı",
      value: "—",
      description: "Kullanıcı verileri gizli tutulur",
      icon: UsersRound,
    },
    {
      label: "Toplam Destek Başvurusu",
      value: new Intl.NumberFormat("tr-TR").format(totalSupports),
      description: "Yayındaki hayallere gelen destekler",
      icon: HandHeart,
    },
    {
      label: "Yayındaki Hayal Sayısı",
      value: new Intl.NumberFormat("tr-TR").format(ideas.length),
      description: "Şu anda keşfedilebilir",
      icon: Radio,
    },
  ];

  return (
    <>
      <section
        className="home-reveal border-y border-slate-200 bg-white py-12 sm:py-16"
        aria-labelledby="platform-statistics-title"
      >
        <PageContainer>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                Büyüyen topluluk
              </p>
              <h2
                id="platform-statistics-title"
                className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950"
              >
                Platform İstatistikleri
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-600">
              İstatistikler herkese açık, yayındaki hayallerden gerçek zamanlı
              olarak hesaplanır.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {statistics.map(({ label, value, description, icon: Icon }) => (
              <Card
                key={label}
                className="group h-full p-4 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg sm:p-6"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {state === "loading" ? (
                  <div
                    aria-hidden="true"
                    className="mt-5 h-9 w-20 animate-pulse rounded-lg bg-slate-200"
                  />
                ) : (
                  <p className="mt-5 text-3xl font-black text-slate-950">
                    {value}
                  </p>
                )}
                <h3 className="mt-2 text-sm font-bold text-slate-800">
                  {label}
                </h3>
                <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      <section
        className="relative overflow-visible pb-14 pt-20 sm:pb-20 sm:pt-24"
        aria-labelledby="discover-title"
      >
        <PageContainer>
          <div className="mx-auto max-w-2xl overflow-visible py-1 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
              İlham veren fikirler
            </p>
            <h2
              id="discover-title"
              className="mt-3 overflow-visible pb-1 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl"
            >
              Keşfet
            </h2>
            <p className="mt-3 overflow-visible pb-1 leading-7 text-slate-600 sm:mt-4">
              Gençlerin geliştirdiği yeni, sevilen ve yükselişte olan hayallere
              göz at.
            </p>
          </div>

          <div
            className="mx-auto mt-8 flex max-w-2xl gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
            role="tablist"
            aria-label="Hayal keşfetme seçenekleri"
          >
            {DISCOVERY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="home-discovery-panel"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.id
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id="home-discovery-panel"
            className="mt-8"
            role="tabpanel"
            aria-live="polite"
          >
            {state === "loading" ? (
              <div className="grid gap-5 md:grid-cols-3" role="status">
                <span className="sr-only">Hayaller yükleniyor...</span>
                {[0, 1, 2].map((item) => (
                  <Card key={item} className="animate-pulse">
                    <div className="h-5 w-1/3 rounded bg-slate-200" />
                    <div className="mt-5 h-6 w-4/5 rounded bg-slate-200" />
                    <div className="mt-4 h-3 rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
                    <div className="mt-8 h-11 rounded-xl bg-slate-200" />
                  </Card>
                ))}
              </div>
            ) : state === "error" ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-800"
                role="alert"
              >
                Hayaller şu anda yüklenemiyor. Lütfen daha sonra tekrar dene.
              </div>
            ) : featuredIdeas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                Henüz keşfedilecek yayında bir hayal yok.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {featuredIdeas.map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
            )}
          </div>
        </PageContainer>
      </section>
    </>
  );
}
