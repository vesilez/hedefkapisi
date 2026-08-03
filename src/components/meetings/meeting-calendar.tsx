"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToMeetings } from "@/services/meeting-service";
import type { Meeting } from "@/types/meeting";
import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MeetingForm } from "./meeting-form";

const statusLabel = { pending: "Planlandı", completed: "Tamamlandı", cancelled: "İptal edildi" } as const;

export function MeetingCalendar({ conversationId }: { conversationId?: string }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    return subscribeToMeetings(user.id, (result) => {
      if (result.success) { setMeetings(result.data); setError(null); }
      else { setMeetings([]); setError(result.error.message); }
    });
  }, [user]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Görüşmeler</p>
        <h1 className="text-3xl font-black text-slate-950">Takvim</h1>
        <p className="mt-2 text-slate-600">Onaylı destek ilişkilerindeki toplantılarını gerçek zamanlı takip et.</p>
      </div>
      {conversationId && <div className="mb-8"><MeetingForm conversationId={conversationId} /></div>}
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {!meetings ? <LoadingSpinner label="Takvim yükleniyor..." /> : meetings.length === 0 ? (
        <EmptyState title="Planlanmış toplantın yok" description="Bir sohbetten Toplantı Planla seçeneğini kullanabilirsin." icon={CalendarDays} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {meetings.map((meeting) => (
            <Link href={`/takvim/${meeting.id}`} key={meeting.id} className="block">
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-blue-300">
                <div className="flex justify-between gap-3"><h2 className="font-bold text-slate-950">{meeting.title}</h2><span className="text-xs font-bold text-blue-700">{statusLabel[meeting.status]}</span></div>
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Clock className="size-4" />{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(meeting.startAt))}</p>
                {meeting.location && <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4" />{meeting.location}</p>}
                {meeting.meetingUrl && <p className="mt-2 flex items-center gap-2 text-sm text-blue-700"><Video className="size-4" />Çevrim içi toplantı</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
