"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPendingSponsorApplications, reviewSponsorApplication } from "@/services/sponsor-service";
import type { AdminSponsorApplication } from "@/types/sponsor";
import { useCallback, useEffect, useState } from "react";

export function AdminSponsorApplications() {
  const [items, setItems] = useState<AdminSponsorApplication[]>([]);
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
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.sponsorId}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                {item.institutionName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{item.email}</p>
            </div>
            <Badge>{item.approvalStatus}</Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-900">Şehir</dt>
              <dd className="mt-1 text-slate-600">{item.city}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Kayıt tarihi</dt>
              <dd className="mt-1 text-slate-600">
                {new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-900">Destek alanları</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {item.supportAreas.map((area) => (
                  <Badge key={area}>{area}</Badge>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-slate-700">{item.description}</p>
          {item.approvalStatus === "pending" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => void review(item.sponsorId, "approved")}>
                Onayla
              </Button>
              <Button
                variant="secondary"
                onClick={() => void review(item.sponsorId, "rejected")}
              >
                Reddet
              </Button>
            </div>
          )}
        </Card>
      ))}
      {!items.length && !feedback && <p>Henüz sponsor başvurusu yok.</p>}
      {feedback && <p role="alert">{feedback}</p>}
    </div>
  );
}
