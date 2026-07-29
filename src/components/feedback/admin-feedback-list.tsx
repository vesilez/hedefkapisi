"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getFeedbackForAdmin,
  updateFeedbackStatus,
} from "@/services/feedback-service";
import type {
  FeedbackStatus,
  FeedbackType,
  PilotFeedback,
} from "@/types/feedback";
import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Hata",
  suggestion: "Öneri",
  satisfaction: "Memnuniyet",
};
const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "Açık",
  reviewing: "İnceleniyor",
  resolved: "Çözüldü",
};

export function AdminFeedbackList() {
  const [items, setItems] = useState<PilotFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getFeedbackForAdmin().then((result) => {
      if (result.success) setItems(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
  }, []);

  async function changeStatus(item: PilotFeedback, status: FeedbackStatus) {
    setBusyId(item.id);
    setError(null);
    const result = await updateFeedbackStatus(item.id, status);
    if (result.success) {
      setItems((current) =>
        current.map((value) =>
          value.id === item.id ? { ...value, status } : value,
        ),
      );
    } else {
      setError(result.error.message);
    }
    setBusyId(null);
  }

  if (loading) return <LoadingSpinner label="Geri bildirimler yükleniyor..." />;
  if (error && items.length === 0) {
    return <Card><p role="alert" className="text-red-800">{error}</p></Card>;
  }
  if (!items.length) {
    return <EmptyState icon={MessageSquareText} title="Henüz geri bildirim yok" description="Pilot kullanıcıların gönderileri burada görüntülenecek." />;
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2"><Badge>{TYPE_LABELS[item.type]}</Badge><Badge>{STATUS_LABELS[item.status]}</Badge></div>
              <h2 className="mt-3 text-xl font-black text-slate-950">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{item.userName || "İsimsiz kullanıcı"} · {item.userEmail} · {new Date(item.createdAt).toLocaleString("tr-TR")}</p>
            </div>
            <Link href={item.pagePath} className="font-semibold text-blue-700 hover:underline">İlgili sayfaya git</Link>
          </div>
          <p className="mt-5 whitespace-pre-wrap break-words leading-7 text-slate-700">{item.description}</p>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Geri bildirim durumu">
            {(["open", "reviewing", "resolved"] as const).map((status) => (
              <Button key={status} variant={item.status === status ? "primary" : "secondary"} disabled={busyId === item.id || item.status === status} onClick={() => changeStatus(item, status)}>
                {STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
