"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { getMeetingJoinAvailability } from "@/lib/meetings/jitsi";
import { getMeeting, updateMeetingStatus } from "@/services/meeting-service";
import type { Meeting, MeetingStatus } from "@/types/meeting";
import { ArrowLeft, CalendarDays, ExternalLink, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusLabels: Record<MeetingStatus, string> = { pending: "Onay bekliyor", accepted: "Kabul edildi", rejected: "Reddedildi", completed: "Tamamlandı", cancelled: "İptal edildi" };
const typeLabels = { online: "Çevrim içi", phone: "Telefon", face_to_face: "Yüz yüze" } as const;

export function MeetingDetail({ meetingId }: { meetingId: string }) {
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setClock] = useState(() => Date.now());

  useEffect(() => { void getMeeting(meetingId).then((result) => result.success ? setMeeting(result.data) : setError(result.error.message)); }, [meetingId]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  async function changeStatus(status: MeetingStatus) {
    const result = await updateMeetingStatus(meetingId, status);
    if (result.success && meeting) setMeeting({ ...meeting, status });
    else if (!result.success) setError(result.error.message);
  }

  if (error) return <main className="mx-auto max-w-3xl p-6"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p></main>;
  if (!meeting) return <LoadingSpinner label="Toplantı yükleniyor..." />;

  const availability = getMeetingJoinAvailability(meeting, user?.id);
  const isParticipant = Boolean(user && meeting.participantIds.includes(user.id));
  const canRespond = meeting.status === "pending" && isParticipant && user?.id !== meeting.organizerId;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/takvim" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft className="size-4" />Takvime dön</Link>
      <Card className="mt-5">
        <CalendarDays className="size-8 text-blue-700" />
        <h1 className="mt-3 text-3xl font-black text-slate-950">{meeting.title}</h1>
        <p className="mt-4 text-slate-600">{meeting.description || "Açıklama eklenmemiş."}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase text-slate-500">Başlangıç</dt><dd className="mt-1 font-semibold">{new Date(meeting.startAt).toLocaleString("tr-TR")}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">Bitiş</dt><dd className="mt-1 font-semibold">{new Date(meeting.endAt).toLocaleString("tr-TR")}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">Durum</dt><dd className="mt-1 font-semibold">{statusLabels[meeting.status]}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">Tür</dt><dd className="mt-1 font-semibold">{typeLabels[meeting.meetingType]}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-500">Konum</dt><dd className="mt-1 font-semibold">{meeting.location ?? (meeting.meetingType === "online" ? "Çevrim içi" : "Belirtilmedi")}</dd></div>
          {meeting.meetingType === "online" && <div><dt className="text-xs font-bold uppercase text-slate-500">Sağlayıcı</dt><dd className="mt-1 font-semibold">{meeting.meetingProvider === "jitsi" ? "Jitsi Meet" : "Bağlantı hazırlanıyor"}</dd></div>}
        </dl>
        {meeting.meetingType === "online" && meeting.meetingLink && <div className="mt-5 min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Görüşme bağlantısı</p><p className="mt-1 truncate text-sm text-blue-700">{meeting.meetingLink}</p></div>}
        <div className="mt-7 flex flex-wrap gap-3">
          {availability.enabled && meeting.meetingLink ? <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white">Toplantıya Katıl<ExternalLink className="size-4" /></a> : meeting.meetingType === "online" ? <Button disabled><Video className="size-4" />Toplantıya Katıl</Button> : null}
          {canRespond && <><Button onClick={() => void changeStatus("accepted")}>Kabul Et</Button><Button variant="secondary" onClick={() => void changeStatus("rejected")}>Reddet</Button></>}
          {meeting.status === "pending" && user?.id === meeting.organizerId && <Button variant="secondary" onClick={() => void changeStatus("cancelled")}>Toplantıyı İptal Et</Button>}
        </div>
        {!availability.enabled && meeting.meetingType === "online" && <p className="mt-3 text-sm text-amber-700" role="status">{availability.reason}</p>}
      </Card>
    </main>
  );
}
