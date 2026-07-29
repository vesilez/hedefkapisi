"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import {
  getAllMentorshipsForAdmin,
  updateMentorshipByAdmin,
} from "@/services/mentorship-service";
import type { Mentorship, MentorshipStatus } from "@/types/mentorship";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS_LABELS: Record<MentorshipStatus, string> = {
  pending: "Bekliyor",
  active: "Aktif",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export function AdminMentorships() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Mentorship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await getAllMentorshipsForAdmin();
    if (result.success) setItems(result.data);
    else setError(result.error.message);
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void getAllMentorshipsForAdmin().then((result) => {
      if (!active) return;
      if (result.success) setItems(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  async function change(
    id: string,
    status: "active" | "completed" | "cancelled",
  ) {
    const result = await updateMentorshipByAdmin(id, status);
    if (result.success) await load();
    else setError(result.error.message);
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Mentorluklar yükleniyor..." />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 text-center">
        <p className="text-red-800" role="alert">
          {error}
        </p>
        <Button className="mt-4" onClick={() => void load()}>
          Yeniden Dene
        </Button>
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="Mentorluk kaydı yok"
        description="Gönderilen mentorluk talepleri burada görünecek."
        icon={ShieldCheck}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {item.studentName} → {item.mentorName}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{STATUS_LABELS[item.status]}</Badge>
                {item.focusAreas.map((area) => (
                  <Badge key={area} className="bg-slate-100 text-slate-700">
                    {area}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {item.message}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.status === "pending" && (
                <Button onClick={() => void change(item.id, "active")}>
                  Aktifleştir
                </Button>
              )}
              {item.status === "active" && (
                <Button onClick={() => void change(item.id, "completed")}>
                  Tamamla
                </Button>
              )}
              {!["completed", "cancelled"].includes(item.status) && (
                <Button
                  variant="secondary"
                  onClick={() => void change(item.id, "cancelled")}
                >
                  İptal Et
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
