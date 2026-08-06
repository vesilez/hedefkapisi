"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { SponsorOfferModal } from "@/components/sponsor/sponsor-offer-modal";
import { SUPPORT_REQUEST_STATUS_LABELS } from "@/constants/support-request-statuses";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { useAuth } from "@/hooks/use-auth";
import {
  getSponsorDashboard,
  saveSponsorApplication,
} from "@/services/sponsor-service";
import type {
  SponsorDashboardData,
  SponsorOfferListItem,
} from "@/types/sponsor";
import type { IdeaListItem } from "@/types/idea";
import { Building2, CheckCircle2, Clock3, HandCoins, Send } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/firestore";
import { doc, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export function SponsorPanel() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SponsorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerIdea, setOfferIdea] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSponsorDashboard();
    if (result.success) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void getSponsorDashboard().then((result) => {
      if (!active) return;
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    return onSnapshot(doc(db, "sponsorProfiles", user.id), () => {
      void load();
    });
  }, [authLoading, load, user]);

  if (authLoading || loading) {
    return <LoadingSpinner label="Sponsor paneli yükleniyor..." />;
  }
  if (!user) return null;
  if (error) {
    return (
      <Card className="text-center">
        <p className="text-red-700" role="alert">
          {error}
        </p>
        <Button className="mt-4" onClick={() => void load()}>
          Tekrar Dene
        </Button>
      </Card>
    );
  }
  if (!data?.profile) return <SponsorApplicationForm onSaved={load} />;

  const approvedOffers = data.offers.filter(
    (offer) => offer.request.status === "approved",
  );
  const pendingOffers = data.offers.filter(
    (offer) => offer.request.status === "pending",
  );
  const rejectedOffers = data.offers.filter(
    (offer) => offer.request.status === "rejected",
  );

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden bg-gradient-to-br from-blue-800 to-blue-950 text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-200">
              Sponsor / Kurum Paneli
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">
              {data.profile.institutionName}
            </h1>
            <p className="mt-3 max-w-2xl text-blue-100">
              Hayalleri keşfedin, sponsorluk tekliflerinizi ve onaylanan
              desteklerinizi tek yerden takip edin.
            </p>
          </div>
          <Badge className="w-fit bg-white/15 text-white">
            {data.profile.approvalStatus === "approved"
              ? "Onaylı kurum"
              : data.profile.approvalStatus === "pending"
                ? "Kurum onayı bekleniyor"
                : "Kurum başvurusu reddedildi"}
          </Badge>
        </div>
      </Card>

      <section aria-labelledby="sponsor-statistics">
        <h2 id="sponsor-statistics" className="sr-only">
          Toplam destek istatistikleri
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticCard
            label="Toplam teklif"
            value={data.statistics.totalOffers}
            icon={Send}
          />
          <StatisticCard
            label="Bekleyen başvuru"
            value={data.statistics.pendingOffers}
            icon={Clock3}
          />
          <StatisticCard
            label="Onaylanan teklif"
            value={data.statistics.approvedOffers}
            icon={CheckCircle2}
          />
          <StatisticCard
            label="Toplam destek"
            value={data.statistics.totalSupports}
            icon={HandCoins}
          />
        </div>
      </section>

      {data.profile.approvalStatus === "approved" && (
        <>
          {offerSuccess && (
            <Card
              className="border-emerald-200 bg-emerald-50 text-emerald-800"
              role="status"
            >
              {offerSuccess}
            </Card>
          )}
          <SponsorIdeaRecommendations
            ideas={data.ideas}
            onSendOffer={(idea) => {
              setOfferSuccess(null);
              setOfferIdea(idea);
            }}
          />
        </>
      )}

      {data.profile.approvalStatus !== "approved" && (
        <Card>
          <p className="text-slate-700">
            Yeni sponsorluk teklifi araçları, kurum başvurunuz onaylandıktan
            sonra kullanıma açılacak. Mevcut tekliflerinizin durumunu aşağıdan
            takip edebilirsiniz.
          </p>
        </Card>
      )}

      <OfferSection
        title="Bekleyen başvurular"
        offers={pendingOffers}
        emptyMessage="Değerlendirme bekleyen sponsorluk teklifiniz yok."
      />
      <OfferSection
        title="Onaylanan destekler"
        offers={approvedOffers}
        emptyMessage="Henüz onaylanan bir sponsorluk teklifiniz yok."
      />
      <OfferSection
        title="Reddedilen teklifler"
        offers={rejectedOffers}
        emptyMessage="Reddedilen bir sponsorluk teklifiniz yok."
      />
      <OfferSection
        title="Gönderdiğim sponsorluk teklifleri"
        offers={data.offers}
        emptyMessage="Henüz bir sponsorluk teklifi göndermediniz."
      />
      {offerIdea && (
        <SponsorOfferModal
          ideaId={offerIdea.id}
          ideaTitle={offerIdea.title}
          onClose={() => setOfferIdea(null)}
          onSuccess={async (ideaTitle) => {
            setOfferIdea(null);
            setOfferSuccess(
              `“${ideaTitle}” için destek teklifiniz başarıyla gönderildi.`,
            );
            await load();
          }}
        />
      )}
    </div>
  );
}

function SponsorIdeaRecommendations({
  ideas,
  onSendOffer,
}: {
  ideas: IdeaListItem[];
  onSendOffer: (idea: { id: string; title: string }) => void;
}) {
  return (
    <section aria-labelledby="sponsor-recommended-ideas">
      <h2
        id="sponsor-recommended-ideas"
        className="text-2xl font-black text-slate-950"
      >
        Sana Önerilen Hayaller
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Destek alanlarınızla eşleşebilecek onaylı hayalleri inceleyin.
      </p>
      {ideas.length === 0 ? (
        <Card className="mt-4 text-slate-600">
          Şimdilik önerilebilecek bir hayal bulunamadı.
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => (
            <Card key={idea.id} className="flex h-full flex-col">
              <h3 className="text-lg font-bold text-slate-950">{idea.title}</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">Kategori</dt>
                  <dd className="text-slate-800">
                    {DEFAULT_CATEGORIES.find(
                      (category) => category.id === idea.categoryId,
                    )?.label ?? idea.categoryId}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Şehir</dt>
                  <dd className="text-slate-800">
                    {idea.city ?? "Belirtilmedi"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-500">
                    İhtiyaç duyulan destekler
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {idea.supportNeeds.map((supportType) => (
                      <Badge key={supportType}>
                        {SUPPORT_TYPE_LABELS[supportType]}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                {idea.shortDescription}
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center">
                <Link
                  href={`/hayaller/${idea.slug}`}
                  className="font-semibold text-blue-700 hover:text-blue-900"
                >
                  Detayları Gör →
                </Link>
                <Button
                  className="sm:ml-auto"
                  type="button"
                  onClick={() =>
                    onSendOffer({ id: idea.id, title: idea.title })
                  }
                >
                  Destek Teklifi Gönder
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function StatisticCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Send;
}) {
  return (
    <Card>
      <Icon className="size-6 text-blue-700" aria-hidden="true" />
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
    </Card>
  );
}

function OfferSection({
  title,
  offers,
  emptyMessage,
}: {
  title: string;
  offers: SponsorOfferListItem[];
  emptyMessage: string;
}) {
  return (
    <section>
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      {offers.length === 0 ? (
        <Card className="mt-4 text-slate-600">{emptyMessage}</Card>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {offers.map(({ request, ideaTitle, ideaSlug }) => (
            <Card key={request.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    {ideaTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "medium",
                    }).format(new Date(request.createdAt))}
                  </p>
                </div>
                <Badge>{SUPPORT_REQUEST_STATUS_LABELS[request.status]}</Badge>
              </div>
              {request.sponsorshipOffer && (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-700">Bütçe</dt>
                    <dd className="mt-1 text-slate-600">
                      {request.sponsorshipOffer.estimatedBudget}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">Süre</dt>
                    <dd className="mt-1 text-slate-600">
                      {request.sponsorshipOffer.duration}
                    </dd>
                  </div>
                </dl>
              )}
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer font-semibold text-blue-800">
                  Teklif detaylarını görüntüle
                </summary>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-700">Açıklama</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                      {request.message}
                    </dd>
                  </div>
                  {request.sponsorshipOffer && (
                    <>
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-slate-700">
                          Sağlanacak kaynaklar
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                          {request.sponsorshipOffer.resources}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-700">
                          Tahmini bütçe
                        </dt>
                        <dd className="mt-1 text-slate-600">
                          {request.sponsorshipOffer.estimatedBudget}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-700">
                          Süre / tarih aralığı
                        </dt>
                        <dd className="mt-1 text-slate-600">
                          {request.sponsorshipOffer.duration}
                        </dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt className="font-semibold text-slate-700">
                      İletişim tercihi
                    </dt>
                    <dd className="mt-1 text-slate-600">
                      {request.contactPreference === "platform"
                        ? "Platform mesajları"
                        : request.contactPreference === "email"
                          ? "E-posta"
                          : "Telefon"}
                    </dd>
                  </div>
                  {request.adminNote && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-slate-700">
                        Yönetici notu
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                        {request.adminNote}
                      </dd>
                    </div>
                  )}
                </dl>
              </details>
              {ideaSlug && (
                <Link
                  href={`/hayaller/${ideaSlug}`}
                  className="mt-4 inline-flex font-semibold text-blue-700 hover:text-blue-900"
                >
                  Hayali görüntüle
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function SponsorApplicationForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [areas, setAreas] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const values = new FormData(event.currentTarget);
    const result = await saveSponsorApplication({
      institutionName: String(values.get("institutionName") ?? ""),
      logoUrl: String(values.get("logoUrl") ?? ""),
      description: String(values.get("description") ?? ""),
      website: String(values.get("website") ?? ""),
      city: String(values.get("city") ?? ""),
      supportAreas: areas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
    if (result.success) await onSaved();
    else setFeedback(result.error.message);
    setBusy(false);
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <Building2 className="size-9 text-blue-700" aria-hidden="true" />
      <h1 className="mt-3 text-3xl font-black text-slate-950">
        Sponsor başvurusu
      </h1>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <Input name="institutionName" required placeholder="Kurum adı" />
        <Input
          name="logoUrl"
          type="url"
          placeholder="Logo URL (isteğe bağlı)"
        />
        <Textarea
          name="description"
          required
          minLength={20}
          placeholder="Kurum ve destek yaklaşımı"
        />
        <Input
          name="website"
          type="url"
          placeholder="Web sitesi (isteğe bağlı)"
        />
        <Input name="city" required placeholder="Şehir" />
        <Input
          required
          value={areas}
          onChange={(event) => setAreas(event.target.value)}
          placeholder="Destek alanları (virgülle ayırın)"
        />
        <Button disabled={busy}>
          {busy ? "Gönderiliyor..." : "Başvuruyu gönder"}
        </Button>
        {feedback && <p role="alert">{feedback}</p>}
      </form>
    </Card>
  );
}
