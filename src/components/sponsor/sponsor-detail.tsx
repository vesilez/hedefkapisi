"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getSponsorProfile } from "@/services/sponsor-service";
import type { SponsorProfile } from "@/types/sponsor";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function SponsorDetail({ sponsorId }: { sponsorId: string }) {
  const [profile, setProfile] = useState<SponsorProfile | null | undefined>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getSponsorProfile(sponsorId).then((result) => {
    if (result.success) setProfile(result.data); else setError(result.error.message);
  }); }, [sponsorId]);
  if (profile === undefined && !error) return <LoadingSpinner label="Sponsor profili yükleniyor..." />;
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return <Card><h1 className="text-xl font-bold">Sponsor bulunamadı</h1></Card>;
  return <Card className="mx-auto max-w-4xl">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {profile.logoUrl ? <Image unoptimized width={112} height={112} src={profile.logoUrl} alt={`${profile.institutionName} logosu`} className="size-28 rounded-3xl border object-contain" /> :
        <span className="flex size-28 items-center justify-center rounded-3xl bg-blue-100"><Building2 className="size-12 text-blue-700" /></span>}
      <div><Badge>Onaylı Sponsor</Badge><h1 className="mt-2 text-3xl font-black text-slate-950">{profile.institutionName}</h1>
        <p className="mt-2 flex items-center gap-2 text-slate-600"><MapPin className="size-4" />{profile.city}</p></div>
    </div>
    <p className="mt-8 whitespace-pre-wrap leading-8 text-slate-700">{profile.description}</p>
    <h2 className="mt-8 font-bold text-slate-950">Destek alanları</h2>
    <div className="mt-3 flex flex-wrap gap-2">{profile.supportAreas.map((area) => <Badge key={area}>{area}</Badge>)}</div>
    {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 font-bold text-blue-700">Web sitesini ziyaret et <ExternalLink className="size-4" /></a>}
  </Card>;
}
