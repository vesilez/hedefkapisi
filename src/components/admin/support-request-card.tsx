"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_REQUEST_STATUS_LABELS } from "@/constants/support-request-statuses";
import { SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import {
  approveSupportRequest,
  rejectSupportRequest,
} from "@/services/support-request-service";
import type { SupportRequest } from "@/types/support-request";
import { useState } from "react";

export function SupportRequestCard({
  request,
  adminId,
  onReviewed,
}: {
  request: SupportRequest;
  adminId: string;
  onReviewed: (requestId: string, message: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await approveSupportRequest(request.id, adminId);
    if (result.success) {
      onReviewed(request.id, "Destek başvurusu onaylandı.");
    } else {
      setError(result.error.message);
      setBusy(false);
    }
  }

  async function reject() {
    if (busy) return;
    if (note.trim().length < 10) {
      setError("Red açıklaması en az 10 karakter olmalıdır.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await rejectSupportRequest(request.id, adminId, note);
    if (result.success) {
      onReviewed(request.id, "Destek başvurusu reddedildi.");
    } else {
      setError(result.error.message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-amber-100 text-amber-800">
          {SUPPORT_REQUEST_STATUS_LABELS[request.status]}
        </Badge>
        {request.supportTypes.map((type) => (
          <Badge key={type} className="bg-emerald-50 text-emerald-800">
            {SUPPORT_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="font-semibold text-slate-700">Fikir ID</dt>
          <dd className="mt-1 break-all text-slate-600">{request.ideaId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Destekçi ID</dt>
          <dd className="mt-1 break-all text-slate-600">{request.supporterId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Başvuru tarihi</dt>
          <dd className="mt-1 text-slate-600">
            {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
              new Date(request.createdAt),
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">Başvuru mesajı</h3>
        <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
          {request.message}
        </p>
      </div>

      {rejecting && (
        <div className="mt-5">
          <label htmlFor={`request-reject-${request.id}`} className="font-semibold text-slate-900">
            Red açıklaması
          </label>
          <Textarea
            id={`request-reject-${request.id}`}
            className="mt-2"
            value={note}
            minLength={10}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `request-error-${request.id}` : undefined}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      )}

      {error && (
        <p id={`request-error-${request.id}`} className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button disabled={busy} onClick={() => void approve()}>
          Onayla
        </Button>
        {rejecting ? (
          <>
            <Button className="bg-red-700 hover:bg-red-800" disabled={busy} onClick={() => void reject()}>
              Reddi Onayla
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setRejecting(false); setError(null); }}>
              Vazgeç
            </Button>
          </>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
            Reddet
          </Button>
        )}
      </div>
    </Card>
  );
}
