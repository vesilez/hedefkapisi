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
  type AdminSupportRequestListItem,
} from "@/services/support-request-service";
import type { SupportRequestStatus } from "@/constants/support-request-statuses";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

export function SupportRequestCard({
  item,
  adminId,
  onReviewed,
}: {
  item: AdminSupportRequestListItem;
  adminId: string;
  onReviewed: (
    requestId: string,
    status: Extract<SupportRequestStatus, "approved" | "rejected">,
    adminNote: string,
    message: string,
  ) => void;
}) {
  const { request, applicantName, applicantEmail } = item;
  const [note, setNote] = useState(request.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(nextAction: "approve" | "reject") {
    if (busy) return;
    if (nextAction === "reject" && note.trim().length < 10) {
      setError("Red açıklaması en az 10 karakter olmalıdır.");
      return;
    }

    setBusy(true);
    setAction(nextAction);
    setError(null);
    const normalizedNote = note.trim();
    const result =
      nextAction === "approve"
        ? await approveSupportRequest(request.id, adminId, normalizedNote)
        : await rejectSupportRequest(request.id, adminId, normalizedNote);

    if (result.success) {
      const status = nextAction === "approve" ? "approved" : "rejected";
      onReviewed(
        request.id,
        status,
        normalizedNote,
        nextAction === "approve"
          ? "Destek başvurusu onaylandı."
          : "Destek başvurusu reddedildi.",
      );
    } else {
      setError(result.error.message);
    }
    setBusy(false);
    setAction(null);
  }

  const statusClass =
    request.status === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : request.status === "rejected"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <Badge className={statusClass}>
          {SUPPORT_REQUEST_STATUS_LABELS[request.status]}
        </Badge>
        {request.supportTypes.map((type) => (
          <Badge key={type} className="bg-emerald-50 text-emerald-800">
            {SUPPORT_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-700">Başvuru sahibi</dt>
          <dd className="mt-1 text-slate-600">{applicantName}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">E-posta</dt>
          <dd className="mt-1 break-all text-slate-600">{applicantEmail}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Destek türü</dt>
          <dd className="mt-1 text-slate-600">
            {request.supportTypes.map((type) => SUPPORT_TYPE_LABELS[type]).join(", ")}
          </dd>
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

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer font-semibold text-blue-800">
          Başvuru detaylarını görüntüle
        </summary>
        <div className="mt-4">
          <h3 className="font-semibold text-slate-900">Başvuru mesajı</h3>
          <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
            {request.message}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-700">Fikir ID</dt>
              <dd className="mt-1 break-all text-slate-600">
                {request.ideaId}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Başvuru sahibi ID</dt>
              <dd className="mt-1 break-all text-slate-600">
                {request.supporterId}
              </dd>
            </div>
          </dl>
          {request.status !== "pending" && (
            <div className="mt-4">
              <h3 className="font-semibold text-slate-900">
                Yönetici notu
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {request.adminNote || "Yönetici notu eklenmedi."}
              </p>
            </div>
          )}
          {request.status === "pending" && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <label
                htmlFor={`request-note-${request.id}`}
                className="font-semibold text-slate-900"
              >
                Yönetici notu
              </label>
              <Textarea
                id={`request-note-${request.id}`}
                className="mt-2 bg-white"
                value={note}
                disabled={busy}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? `request-error-${request.id}` : undefined
                }
                onChange={(event) => setNote(event.target.value)}
              />

              {error && (
                <p
                  id={`request-error-${request.id}`}
                  className="mt-3 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button disabled={busy} onClick={() => void review("approve")}>
                  {busy && action === "approve" && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="mr-2 size-4 animate-spin"
                    />
                  )}
                  Onayla
                </Button>
                <Button
                  className="bg-red-700 hover:bg-red-800"
                  disabled={busy}
                  onClick={() => void review("reject")}
                >
                  {busy && action === "reject" && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="mr-2 size-4 animate-spin"
                    />
                  )}
                  Reddet
                </Button>
              </div>
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}
