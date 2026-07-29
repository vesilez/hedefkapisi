"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  addMentorEvaluation,
  addMentorNote,
  completeMentorship,
  getMentorDashboard,
  respondToMentorshipRequest,
} from "@/services/mentorship-service";
import type {
  MentorDashboardData,
  MentorStudent,
  Mentorship,
} from "@/types/mentorship";
import {
  Check,
  CheckCircle2,
  Clock3,
  MessageCircle,
  NotebookPen,
  Star,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type ViewState = "loading" | "ready" | "error";

export function MentorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [data, setData] = useState<MentorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setState("loading");
    const result = await getMentorDashboard();
    if (result.success) {
      setData(result.data);
      setState("ready");
    } else {
      setError(result.error.message);
      setState("error");
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void getMentorDashboard().then((result) => {
      if (!active) return;
      if (result.success) {
        setData(result.data);
        setState("ready");
      } else {
        setError(result.error.message);
        setState("error");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  if (state === "loading" || authLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Mentor paneli yükleniyor..." />
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <Card className="border-red-200 bg-red-50 text-center">
        <p className="font-semibold text-red-800" role="alert">
          {error ?? "Mentor paneli yüklenemedi."}
        </p>
        <Button className="mt-4" onClick={() => void load()}>
          Yeniden Dene
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bekleyen talepler"
          value={data.pending.length}
          icon={Clock3}
        />
        <StatCard
          label="Aktif öğrenciler"
          value={data.active.length}
          icon={Users}
        />
        <StatCard
          label="Tamamlanan"
          value={data.completed.length}
          icon={CheckCircle2}
        />
        <StatCard label="Reddedilen/iptal" value={data.rejected} icon={X} />
      </div>

      <PanelSection title="Bekleyen Talepler" count={data.pending.length}>
        {data.pending.length === 0 ? (
          <EmptyState
            title="Bekleyen talep yok"
            description="Yeni öğrenci talepleri burada görünecek."
            icon={Clock3}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.pending.map((request) => (
              <PendingRequest
                key={request.id}
                request={request}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Aktif Öğrenciler" count={data.active.length}>
        {data.active.length === 0 ? (
          <EmptyState
            title="Aktif öğrenci yok"
            description="Kabul ettiğin mentorluklar burada görünecek."
            icon={Users}
          />
        ) : (
          <div className="grid gap-5">
            {data.active.map((student) => (
              <ActiveStudent
                key={student.id}
                student={student}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Tamamlanan Mentorluklar"
        count={data.completed.length}
      >
        {data.completed.length === 0 ? (
          <EmptyState
            title="Tamamlanan mentorluk yok"
            description="Tamamlanan çalışmalar burada arşivlenecek."
            icon={CheckCircle2}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.completed.map((mentorship) => (
              <Card key={mentorship.id}>
                <h3 className="font-bold text-slate-950">
                  {mentorship.studentName}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mentorship.focusAreas.map((area) => (
                    <Badge key={area}>{area}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </PanelSection>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
}) {
  return (
    <Card>
      <Icon aria-hidden="true" className="size-6 text-blue-700" />
      <p className="mt-3 text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </Card>
  );
}

function PanelSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <Badge>{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function PendingRequest({
  request,
  onChanged,
}: {
  request: Mentorship;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(decision: "active" | "rejected") {
    setBusy(true);
    const result = await respondToMentorshipRequest(request.id, decision);
    if (result.success) await onChanged();
    else setError(result.error.message);
    setBusy(false);
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-slate-950">
        {request.studentName}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {request.focusAreas.map((area) => (
          <Badge key={area}>{area}</Badge>
        ))}
      </div>
      <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600">
        {request.message}
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void respond("active")}>
          <Check aria-hidden="true" className="size-4" />
          Kabul Et
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void respond("rejected")}
        >
          <X aria-hidden="true" className="size-4" />
          Reddet
        </Button>
      </div>
    </Card>
  );
}

function ActiveStudent({
  student,
  onChanged,
}: {
  student: MentorStudent;
  onChanged: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [progress, setProgress] = useState(3);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function saveNote() {
    const result = await addMentorNote(student.id, note);
    if (result.success) {
      setNote("");
      setFeedback("Not kaydedildi.");
      await onChanged();
    } else setFeedback(result.error.message);
  }

  async function saveEvaluation() {
    const result = await addMentorEvaluation(student.id, {
      progress,
      summary,
      nextSteps,
    });
    if (result.success) {
      setSummary("");
      setNextSteps("");
      setFeedback("İlerleme değerlendirmesi kaydedildi.");
      await onChanged();
    } else setFeedback(result.error.message);
  }

  async function complete() {
    const result = await completeMentorship(student.id);
    if (result.success) await onChanged();
    else setFeedback(result.error.message);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-950">
            {student.studentName}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {student.focusAreas.map((area) => (
              <Badge key={area}>{area}</Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.chatId && (
            <Link
              href={`/mesajlar?sohbet=${student.chatId}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Mesajlaş
            </Link>
          )}
          <Button variant="secondary" onClick={() => void complete()}>
            Mentorluğu Tamamla
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div>
          <h4 className="font-bold text-slate-900">Öğrencinin Hayalleri</h4>
          <div className="mt-3 space-y-2">
            {student.ideas.length === 0 ? (
              <p className="text-sm text-slate-500">Yayınlanmış hayal yok.</p>
            ) : (
              student.ideas.map((idea) => (
                <Link
                  key={idea.id}
                  href={`/hayaller/${idea.slug}`}
                  className="block rounded-xl border border-slate-200 p-3 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  {idea.title}
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-bold text-slate-900">
            <NotebookPen aria-hidden="true" className="size-4" />
            Mentor Notları
          </h4>
          <Textarea
            className="mt-3"
            value={note}
            maxLength={3000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Sadece mentor ve admin görebilir..."
          />
          <Button
            className="mt-2"
            disabled={note.trim().length < 3}
            onClick={() => void saveNote()}
          >
            Not Ekle
          </Button>
          <p className="mt-3 text-xs text-slate-500">
            {student.notes.length} kayıtlı not
          </p>
        </div>

        <div>
          <h4 className="flex items-center gap-2 font-bold text-slate-900">
            <Star aria-hidden="true" className="size-4" />
            İlerleme Değerlendirmesi
          </h4>
          <Select
            className="mt-3"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            aria-label="İlerleme seviyesi"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </Select>
          <Textarea
            className="mt-2"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Genel değerlendirme"
          />
          <Textarea
            className="mt-2"
            value={nextSteps}
            onChange={(event) => setNextSteps(event.target.value)}
            placeholder="Sonraki adımlar"
          />
          <Button
            className="mt-2"
            disabled={summary.trim().length < 10 || nextSteps.trim().length < 5}
            onClick={() => void saveEvaluation()}
          >
            Değerlendirmeyi Kaydet
          </Button>
        </div>
      </div>
      {feedback && (
        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
          {feedback}
        </p>
      )}
    </Card>
  );
}
