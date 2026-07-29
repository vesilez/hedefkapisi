"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getApprovedSponsors } from "@/services/sponsor-service";
import type { SponsorProfile } from "@/types/sponsor";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export function SponsorDirectory() {
  const [items, setItems] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getApprovedSponsors().then((result) => {
      if (result.success) setItems(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner label="Sponsorlar yükleniyor..." />;
  if (error) return <p role="alert" className="rounded-2xl bg-red-50 p-5 text-red-800">{error}</p>;
  if (!items.length) return <EmptyState icon={Building2} title="Henüz onaylı sponsor yok" description="Onaylanan kurumlar burada listelenecek." />;

  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {items.map((item) => <Card key={item.sponsorId} className="flex h-full flex-col">
      <div className="flex items-center gap-4">
        {item.logoUrl ? <Image unoptimized width={64} height={64} src={item.logoUrl} alt="" className="size-16 rounded-2xl border object-contain" /> :
          <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-100"><Building2 className="size-8 text-blue-700" /></span>}
        <div><h2 className="text-xl font-extrabold text-slate-950">{item.institutionName}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="size-4" />{item.city}</p></div>
      </div>
      <p className="mt-4 line-clamp-3 text-slate-600">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">{item.supportAreas.map((area) => <Badge key={area}>{area}</Badge>)}</div>
      <Link href={`/sponsorlar/${item.sponsorId}`} className="mt-auto inline-flex items-center gap-2 pt-5 font-bold text-blue-700">
        Kurumu incele <ExternalLink className="size-4" />
      </Link>
    </Card>)}
  </div>;
}
