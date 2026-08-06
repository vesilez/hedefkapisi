"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_LABELS,
  SUPPORT_TYPE_MVP_ENABLED,
  type SupportType,
} from "@/constants/support-types";
import { createSupportRequestSchema } from "@/lib/validations/support-request-schema";
import { createSupportRequest } from "@/services/support-request-service";
import type { ContactPreference } from "@/types/support-request";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

const ENABLED_SUPPORT_TYPES = SUPPORT_TYPES.filter(
  (type) => type === "financial" || SUPPORT_TYPE_MVP_ENABLED[type],
);

export function SponsorOfferModal({
  ideaId,
  ideaTitle,
  onClose,
  onSuccess,
}: {
  ideaId: string;
  ideaTitle: string;
  onClose: () => void;
  onSuccess: (ideaTitle: string) => Promise<void>;
}) {
  const titleId = useId();
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [message, setMessage] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [resources, setResources] = useState("");
  const [duration, setDuration] = useState("");
  const [contactPreference, setContactPreference] =
    useState<ContactPreference>("platform");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, submitting]);

  function toggleSupportType(type: SupportType) {
    setError(null);
    setSupportTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : current.length < 4
          ? [...current, type]
          : current,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const validation = createSupportRequestSchema.safeParse({
      ideaId,
      applicationType: "sponsorship",
      supportTypes,
      message,
      contactPreference,
      contributionDetails: null,
      sponsorshipOffer: { estimatedBudget, resources, duration },
    });
    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Teklif bilgileri geçersiz.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createSupportRequest(validation.data);
    if (!result.success) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    await onSuccess(ideaTitle);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-950 p-5 text-slate-100 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              Sponsorluk teklifi
            </p>
            <h2 id={titleId} className="mt-1 text-2xl font-black text-white">
              {ideaTitle}
            </h2>
          </div>
          <Button
            aria-label="Teklif formunu kapat"
            className="shrink-0 border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
            disabled={submitting}
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <form
          className="mt-6 grid gap-5"
          onSubmit={(event) => void submit(event)}
        >
          <fieldset>
            <legend className="font-semibold text-white">Destek türleri</legend>
            <p className="mt-1 text-sm text-slate-400">
              En az 1, en fazla 4 seçim yapın.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ENABLED_SUPPORT_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    supportTypes.includes(type)
                      ? "border-blue-400 bg-blue-500/20 text-blue-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <input
                    checked={supportTypes.includes(type)}
                    className="size-4 accent-blue-500"
                    disabled={
                      submitting ||
                      (!supportTypes.includes(type) && supportTypes.length >= 4)
                    }
                    type="checkbox"
                    onChange={() => toggleSupportType(type)}
                  />
                  {SUPPORT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="font-semibold text-white">
            Teklif açıklaması
            <Textarea
              autoFocus
              className="mt-2 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              disabled={submitting}
              maxLength={1500}
              minLength={20}
              placeholder="Teklifinizin kapsamını ve hayale sağlayacağı katkıyı açıklayın."
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              20–1500 karakter · {message.length}/1500
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="font-semibold text-white">
              Tahmini bütçe
              <Input
                className="mt-2 border-slate-700 bg-slate-900 text-white"
                disabled={submitting}
                min="0"
                placeholder="0"
                required
                step="0.01"
                type="number"
                value={estimatedBudget}
                onChange={(event) => setEstimatedBudget(event.target.value)}
              />
            </label>
            <label className="font-semibold text-white">
              Süre / tarih aralığı
              <Input
                className="mt-2 border-slate-700 bg-slate-900 text-white"
                disabled={submitting}
                maxLength={200}
                placeholder="Örn. 1 Eylül – 30 Kasım 2026"
                required
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </label>
          </div>

          <label className="font-semibold text-white">
            Sağlanacak kaynaklar
            <Textarea
              className="mt-2 border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              disabled={submitting}
              maxLength={1500}
              minLength={10}
              placeholder="Finansman, ekipman, uzman, mekân veya diğer kaynaklar"
              required
              value={resources}
              onChange={(event) => setResources(event.target.value)}
            />
          </label>

          <label className="font-semibold text-white">
            İletişim tercihi
            <Select
              className="mt-2 border-slate-700 bg-slate-900 text-white"
              disabled={submitting}
              value={contactPreference}
              onChange={(event) =>
                setContactPreference(event.target.value as ContactPreference)
              }
            >
              <option value="platform">Platform mesajları</option>
              <option value="email">E-posta</option>
              <option value="phone">Telefon</option>
            </Select>
          </label>

          {error && (
            <p
              aria-live="assertive"
              className="rounded-xl border border-red-800 bg-red-950/70 p-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              disabled={submitting}
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Vazgeç
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting && (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              )}
              {submitting ? "Gönderiliyor..." : "Destek Teklifini Gönder"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
