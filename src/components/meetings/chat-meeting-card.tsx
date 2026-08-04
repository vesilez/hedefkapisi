"use client";

import { getMeetingJoinAvailability } from "@/lib/meetings/jitsi";
import { subscribeToMeetings } from "@/services/meeting-service";
import type { Meeting } from "@/types/meeting";
import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ChatMeetingCard({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [, setClock] = useState(() => Date.now());
  useEffect(() => subscribeToMeetings(userId, (result) => {
    if (!result.success) return;
    const relevant = result.data.filter((item) => item.conversationId === conversationId && !["completed", "cancelled", "rejected"].includes(item.status)).sort((a, b) => a.startAt.localeCompare(b.startAt))[0] ?? null;
    setMeeting(relevant);
  }), [conversationId, userId]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  if (!meeting) return null;
  const availability = getMeetingJoinAvailability(meeting, userId);
  return (
    <aside className="mb-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CalendarDays className="size-5 shrink-0 text-blue-700" aria-hidden="true" />
        <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-950">{meeting.title}</p><p className="text-xs text-slate-500">{new Date(meeting.startAt).toLocaleString("tr-TR")}</p></div>
        {availability.enabled && meeting.meetingLink ? <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">Görüşmeye Katıl<ExternalLink className="size-4" /></a> : <button type="button" disabled className="min-h-10 rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500">Görüşmeye Katıl</button>}
        <Link href={`/takvim/${meeting.id}`} className="text-center text-sm font-semibold text-blue-700">Detay</Link>
      </div>
      {!availability.enabled && <p className="mt-2 text-xs text-amber-700">{availability.reason}</p>}
    </aside>
  );
}
