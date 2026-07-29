"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPendingSponsorApplications, reviewSponsorApplication } from "@/services/sponsor-service";
import type { SponsorProfile } from "@/types/sponsor";
import { useCallback, useEffect, useState } from "react";

export function AdminSponsorApplications() {
  const [items, setItems] = useState<SponsorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const load = useCallback(async () => { const result = await getPendingSponsorApplications(); if (result.success) setItems(result.data); else setFeedback(result.error.message); setLoading(false); }, []);
  useEffect(() => {
    void getPendingSponsorApplications().then((result) => {
      if (result.success) setItems(result.data);
      else setFeedback(result.error.message);
      setLoading(false);
    });
  }, []);
  async function review(id: string, status: "approved" | "rejected") {
    const result = await reviewSponsorApplication(id, status);
    if (!result.success) setFeedback(result.error.message); else await load();
  }
  if (loading) return <LoadingSpinner label="Başvurular yükleniyor..." />;
  return <div className="space-y-4">{items.map((item) => <Card key={item.sponsorId}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">{item.institutionName}</h2><p className="text-slate-600">{item.city}</p></div><Badge>{item.status}</Badge></div>
    <p className="mt-4 text-slate-700">{item.description}</p>
    {item.status === "pending" && <div className="mt-4 flex gap-3"><Button onClick={() => review(item.sponsorId, "approved")}>Onayla</Button><Button variant="secondary" onClick={() => review(item.sponsorId, "rejected")}>Reddet</Button></div>}
  </Card>)}{!items.length && <p>Henüz sponsor başvurusu yok.</p>}{feedback && <p role="alert">{feedback}</p>}</div>;
}
