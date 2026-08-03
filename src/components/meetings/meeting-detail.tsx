"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getMeeting, updateMeetingStatus } from "@/services/meeting-service";
import type { Meeting } from "@/types/meeting";
import { ArrowLeft, CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function MeetingDetail({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getMeeting(meetingId).then((result) => result.success ? setMeeting(result.data) : setError(result.error.message)); }, [meetingId]);
  async function cancel() { const result = await updateMeetingStatus(meetingId, "cancelled"); if (result.success && meeting) setMeeting({ ...meeting, status: "cancelled" }); else if (!result.success) setError(result.error.message); }
  if (error) return <main className="mx-auto max-w-3xl p-6"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p></main>;
  if (!meeting) return <LoadingSpinner label="Toplantı yükleniyor..." />;
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><Link href="/takvim" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft className="size-4" />Takvime dön</Link><Card className="mt-5"><CalendarDays className="size-8 text-blue-700" /><h1 className="mt-3 text-3xl font-black text-slate-950">{meeting.title}</h1><p className="mt-4 text-slate-600">{meeting.description || "Açıklama eklenmemiş."}</p><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase text-slate-500">Başlangıç</dt><dd className="mt-1 font-semibold">{new Date(meeting.startAt).toLocaleString("tr-TR")}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Bitiş</dt><dd className="mt-1 font-semibold">{new Date(meeting.endAt).toLocaleString("tr-TR")}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Durum</dt><dd className="mt-1 font-semibold">{meeting.status}</dd></div><div><dt className="text-xs font-bold uppercase text-slate-500">Konum</dt><dd className="mt-1 font-semibold">{meeting.location ?? "Çevrim içi"}</dd></div></dl><div className="mt-7 flex flex-wrap gap-3">{meeting.meetingUrl && <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white">Toplantıya Katıl<ExternalLink className="size-4" /></a>}{meeting.status === "pending" && <Button variant="secondary" onClick={() => void cancel()}>Toplantıyı İptal Et</Button>}</div></Card></main>;
}
