"use client";

import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToMeetings, updateMeetingStatus } from "@/services/meeting-service";
import type { Meeting } from "@/types/meeting";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminMeetings() {
  const { user } = useAuth();
  const [items, setItems] = useState<Meeting[] | null>(null);
  useEffect(() => user ? subscribeToMeetings(user.id, (result) => setItems(result.success ? result.data : []), true) : undefined, [user]);
  if (!items) return <LoadingSpinner label="Toplantılar yükleniyor..." />;
  return <div className="space-y-3">{items.length === 0 && <Card>Henüz toplantı yok.</Card>}{items.map((meeting) => <Card key={meeting.id} className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><Link href={`/takvim/${meeting.id}`} className="font-bold text-blue-800">{meeting.title}</Link><p className="mt-1 text-sm text-slate-600">{new Date(meeting.startAt).toLocaleString("tr-TR")} · {meeting.participantIds.length} katılımcı</p></div><span className="text-sm font-semibold">{meeting.status}</span>{meeting.status === "pending" && <button className="text-sm font-semibold text-red-700" onClick={() => void updateMeetingStatus(meeting.id, "cancelled")}>İptal et</button>}</Card>)}</div>;
}
