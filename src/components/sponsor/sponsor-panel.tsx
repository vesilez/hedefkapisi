"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createOfficialSponsorSupport, getSponsorDashboard, saveSponsorApplication } from "@/services/sponsor-service";
import type { SponsorDashboardData } from "@/types/sponsor";
import { Building2, Filter, History, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export function SponsorPanel() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SponsorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [supportArea, setSupportArea] = useState("");
  const load = useCallback(async () => {
    const result = await getSponsorDashboard({ search, category, city, supportArea });
    if (result.success) setData(result.data); else setFeedback(result.error.message);
    setLoading(false);
  }, [search, category, city, supportArea]);
  useEffect(() => {
    if (authLoading || !user) return;
    void getSponsorDashboard({ search, category, city, supportArea }).then((result) => {
      if (result.success) setData(result.data);
      else setFeedback(result.error.message);
      setLoading(false);
    });
  }, [authLoading, user, search, category, city, supportArea]);
  if (authLoading || loading) return <LoadingSpinner label="Sponsor paneli yükleniyor..." />;
  if (!user) return <Card><p>Bu sayfa için giriş yapmalısınız.</p></Card>;
  if (!data?.profile) return <SponsorApplicationForm onSaved={load} />;

  return <div className="space-y-8">
    <Card><div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-wider text-blue-700">Sponsor Paneli</p>
        <h1 className="text-3xl font-black text-slate-950">{data.profile.institutionName}</h1></div>
      <Badge>{data.profile.status === "approved" ? "Onaylı" : data.profile.status === "pending" ? "Onay bekliyor" : "Reddedildi"}</Badge>
    </div></Card>
    {data.profile.status !== "approved" ? <Card><p className="text-slate-700">Resmî destek araçları başvurunuz onaylandıktan sonra açılacak.</p></Card> :
      <>
        <section><h2 className="flex items-center gap-2 text-2xl font-black text-slate-950"><Filter className="size-5" />Hayalleri keşfet</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input aria-label="Hayallerde ara" placeholder="Başlık veya açıklama" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Input aria-label="Kategori filtresi" placeholder="Kategori kodu" value={category} onChange={(event) => setCategory(event.target.value)} />
            <Input aria-label="Şehir filtresi" placeholder="Şehir" value={city} onChange={(event) => setCity(event.target.value)} />
            <Input aria-label="Destek alanı filtresi" placeholder="Destek türü" value={supportArea} onChange={(event) => setSupportArea(event.target.value)} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">{data.ideas.map((idea) => <SupportIdeaCard key={idea.id} idea={idea} onSupported={load} />)}</div>
          {!data.ideas.length && <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-slate-600">Filtreye uygun hayal bulunamadı.</p>}
        </section>
        <section><h2 className="flex items-center gap-2 text-2xl font-black text-slate-950"><History className="size-5" />Destek geçmişi</h2>
          <div className="mt-4 space-y-3">{data.supports.map((support) => <Card key={support.id}><strong>{support.ideaTitle}</strong><p className="mt-1 text-sm text-slate-600">{new Date(support.createdAt).toLocaleString("tr-TR")}</p></Card>)}
          {!data.supports.length && <p className="text-slate-600">Henüz resmî destek verilmedi.</p>}</div>
        </section>
      </>}
    {feedback && <p role="status">{feedback}</p>}
  </div>;
}

function SponsorApplicationForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [areas, setAreas] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const values = new FormData(event.currentTarget);
    const result = await saveSponsorApplication({
      institutionName: String(values.get("institutionName") ?? ""),
      logoUrl: String(values.get("logoUrl") ?? ""),
      description: String(values.get("description") ?? ""),
      website: String(values.get("website") ?? ""),
      city: String(values.get("city") ?? ""),
      supportAreas: areas.split(",").map((item) => item.trim()).filter(Boolean),
    });
    if (result.success) await onSaved(); else setFeedback(result.error.message);
    setBusy(false);
  }
  return <Card className="mx-auto max-w-2xl"><Building2 className="size-9 text-blue-700" /><h1 className="mt-3 text-3xl font-black text-slate-950">Sponsor başvurusu</h1>
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <Input name="institutionName" required placeholder="Kurum adı" />
      <Input name="logoUrl" type="url" placeholder="Logo URL (isteğe bağlı)" />
      <Textarea name="description" required minLength={20} placeholder="Kurum ve destek yaklaşımı" />
      <Input name="website" type="url" placeholder="Web sitesi (isteğe bağlı)" />
      <Input name="city" required placeholder="Şehir" />
      <Input required value={areas} onChange={(event) => setAreas(event.target.value)} placeholder="Destek alanları (virgülle ayırın)" />
      <Button disabled={busy}>{busy ? "Gönderiliyor..." : "Başvuruyu gönder"}</Button>
      {feedback && <p role="alert">{feedback}</p>}
    </form></Card>;
}

function SupportIdeaCard({ idea, onSupported }: { idea: SponsorDashboardData["ideas"][number]; onSupported: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  async function support() {
    setBusy(true); const result = await createOfficialSponsorSupport({ ideaId: idea.id, message });
    if (result.success) { setMessage(""); setFeedback("Resmî destek kaydedildi."); await onSupported(); }
    else setFeedback(result.error.message); setBusy(false);
  }
  return <Card><h3 className="text-xl font-bold text-slate-950">{idea.title}</h3><p className="mt-2 line-clamp-2 text-slate-600">{idea.shortDescription}</p>
    <div className="mt-3 flex flex-wrap gap-2">{idea.supportNeeds.map((need) => <Badge key={need}>{need}</Badge>)}</div>
    <Textarea className="mt-4" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Resmî destek mesajınız" />
    <Button className="mt-3" onClick={support} disabled={busy || message.trim().length < 10}><Send className="size-4" />Destek ver</Button>
    {feedback && <p className="mt-2 text-sm" role="status">{feedback}</p>}
  </Card>;
}
