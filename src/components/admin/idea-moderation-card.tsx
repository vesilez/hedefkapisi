"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import { IDEA_STAGE_LABELS } from "@/constants/idea-stages";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import {
  approveIdea,
  rejectIdea,
  requestIdeaRevision,
} from "@/services/idea-service";
import type { Idea } from "@/types/idea";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

type ModerationMode = "revision" | "reject" | null;

interface IdeaModerationCardProps {
  idea: Idea;
  adminId: string;
  onModerated: (ideaId: string, message: string) => void;
}

export function IdeaModerationCard({
  idea,
  adminId,
  onModerated,
}: IdeaModerationCardProps) {
  const [mode, setMode] = useState<ModerationMode>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const category =
    DEFAULT_CATEGORIES.find((item) => item.id === idea.categoryId)?.label ??
    "Diğer";

  async function approve() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await approveIdea(idea.id, adminId);
    if (result.success) {
      onModerated(idea.id, "Fikir onaylandı ve yayına alındı.");
      return;
    }
    setError(result.error.message);
    setBusy(false);
  }

  async function submitWithNote() {
    if (busy || !mode) return;
    if (note.trim().length < 10) {
      setError(
        mode === "reject"
          ? "Red nedeni en az 10 karakter olmalıdır."
          : "Revizyon açıklaması en az 10 karakter olmalıdır.",
      );
      return;
    }

    setBusy(true);
    setError(null);
    const result =
      mode === "reject"
        ? await rejectIdea(idea.id, adminId, note)
        : await requestIdeaRevision(idea.id, adminId, note);

    if (result.success) {
      onModerated(
        idea.id,
        mode === "reject"
          ? "Fikir reddedildi."
          : "Fikir için revizyon istendi.",
      );
      return;
    }
    setError(result.error.message);
    setBusy(false);
  }

  function selectMode(nextMode: Exclude<ModerationMode, null>) {
    if (busy) return;
    setMode(nextMode);
    setNote("");
    setError(null);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{category}</Badge>
        <Badge className="bg-slate-100 text-slate-700">
          {IDEA_STAGE_LABELS[idea.stage]}
        </Badge>
        <Badge className="bg-amber-100 text-amber-800">Onay Bekliyor</Badge>
      </div>

      <h2 className="mt-4 text-xl font-bold text-slate-950">{idea.title}</h2>
      <p className="mt-2 leading-7 text-slate-600">{idea.shortDescription}</p>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-700">Öğrenci ID</dt>
          <dd className="mt-1 break-all text-slate-600">{idea.studentId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Şehir</dt>
          <dd className="mt-1 text-slate-600">{idea.city || "Belirtilmedi"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Görünürlük</dt>
          <dd className="mt-1 text-slate-600">{idea.visibility}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Oluşturulma</dt>
          <dd className="mt-1 text-slate-600">
            {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
              new Date(idea.createdAt),
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {idea.supportNeeds.map((supportType) => (
          <Badge key={supportType} className="bg-emerald-50 text-emerald-800">
            {SUPPORT_TYPE_LABELS[supportType]}
          </Badge>
        ))}
      </div>

      <details className="mt-6 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer font-semibold text-blue-800">
          Fikir detaylarını incele
        </summary>
        <div className="mt-4 grid gap-5 text-sm leading-7 text-slate-700">
          <div>
            <h3 className="font-bold text-slate-950">Detaylı açıklama</h3>
            <p className="mt-1 whitespace-pre-wrap">{idea.description}</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Problem</h3>
            <p className="mt-1 whitespace-pre-wrap">{idea.problem}</p>
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Çözüm</h3>
            <p className="mt-1 whitespace-pre-wrap">{idea.solution}</p>
          </div>
        </div>
      </details>

      {mode && (
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <label
            htmlFor={`${mode}-note-${idea.id}`}
            className="text-sm font-semibold text-slate-800"
          >
            {mode === "reject" ? "Red nedeni" : "Revizyon açıklaması"}
          </label>
          <Textarea
            id={`${mode}-note-${idea.id}`}
            className="mt-2 min-h-28"
            value={note}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `moderation-error-${idea.id}` : undefined}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void submitWithNote()}
            >
              {busy && (
                <LoaderCircle
                  className="mr-2 size-5 animate-spin"
                  aria-hidden="true"
                />
              )}
              {mode === "reject" ? "Reddi Onayla" : "Revizyon İsteğini Gönder"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setMode(null)}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p
          id={`moderation-error-${idea.id}`}
          className="mt-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" disabled={busy} onClick={() => void approve()}>
          {busy && !mode && (
            <LoaderCircle
              className="mr-2 size-5 animate-spin"
              aria-hidden="true"
            />
          )}
          Onayla
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => selectMode("revision")}
        >
          Revizyon İste
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => selectMode("reject")}
          className="text-red-700 hover:bg-red-50"
        >
          Reddet
        </Button>
      </div>
    </Card>
  );
}
