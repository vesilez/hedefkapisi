"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { meetingSchema } from "@/lib/validations/meeting-schema";
import { createMeeting } from "@/services/meeting-service";
import { CalendarPlus, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

function toDateTimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function defaultMeetingTimes() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { startAt: toDateTimeLocalValue(start), endAt: toDateTimeLocalValue(end) };
}

export function MeetingForm({ conversationId, onClose }: { conversationId: string; onClose?: () => void }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaults] = useState(defaultMeetingTimes);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }
    const form = new FormData(formElement);
    const values = {
      conversationId,
      title: form.get("title"),
      description: form.get("description"),
      startAt: form.get("startAt"),
      endAt: form.get("endAt"),
      location: form.get("location"),
      meetingType: form.get("meetingType"),
    };
    const validation = meetingSchema.safeParse(values);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Toplantı bilgileri geçersiz.");
      return;
    }
    setSending(true);
    setError(null);
    const result = await createMeeting(validation.data);
    setSending(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.push(`/takvim/${result.data}`);
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <CalendarPlus className="size-5 text-blue-700" aria-hidden="true" /> Toplantı Planla
        </h2>
        {onClose && <button type="button" onClick={onClose} aria-label="Formu kapat"><X className="size-5" /></button>}
      </div>
      <label className="block text-sm font-semibold text-slate-700">Başlık<Input name="title" required minLength={3} maxLength={120} className="mt-1" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">Başlangıç<Input name="startAt" type="datetime-local" required step={60} defaultValue={defaults.startAt} className="mt-1" /></label>
        <label className="block text-sm font-semibold text-slate-700">Bitiş<Input name="endAt" type="datetime-local" required step={60} defaultValue={defaults.endAt} className="mt-1" /></label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">Toplantı türü<select name="meetingType" defaultValue="online" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="online">Çevrim içi (Jitsi Meet)</option><option value="phone">Telefon</option><option value="face_to_face">Yüz yüze</option></select></label>
      <label className="block text-sm font-semibold text-slate-700">Konum / telefon bilgisi<Input name="location" maxLength={200} className="mt-1" placeholder="Online toplantılarda isteğe bağlı" /></label>
      <label className="block text-sm font-semibold text-slate-700">Açıklama<Textarea name="description" maxLength={1000} rows={4} className="mt-1" /></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Button type="submit" disabled={sending}>{sending ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}Toplantıyı Kaydet</Button>
    </form>
  );
}
