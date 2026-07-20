"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_LABELS,
  SUPPORT_TYPE_MVP_ENABLED,
  type SupportType,
} from "@/constants/support-types";
import { useAuth } from "@/hooks/use-auth";
import { createSupportRequestSchema } from "@/lib/validations/support-request-schema";
import { createSupportRequest } from "@/services/support-request-service";
import { getUserProfile } from "@/services/user-service";
import Link from "next/link";
import { useEffect, useState } from "react";

type AccessState = "loading" | "eligible" | "ineligible" | "incomplete" | "error";

const ENABLED_SUPPORT_TYPES = SUPPORT_TYPES.filter(
  (type) => type !== "financial" && SUPPORT_TYPE_MVP_ENABLED[type],
);

export function SupportRequestForm({ ideaId }: { ideaId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    void getUserProfile(user.id).then((result) => {
      if (!active) return;
      setCheckedUserId(user.id);
      if (!result.success || !result.data) {
        setAccessState("error");
      } else if (result.data.role !== "supporter" && result.data.role !== "mentor") {
        setAccessState("ineligible");
      } else if (!result.data.profileCompleted) {
        setAccessState("incomplete");
      } else {
        setAccessState("eligible");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    const validation = createSupportRequestSchema.safeParse({
      ideaId,
      supportTypes,
      message,
    });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createSupportRequest(validation.data);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error.message);
    }
    setSubmitting(false);
  }

  const loadingProfile =
    authLoading ||
    (user !== null &&
      (checkedUserId !== user.id || accessState === "loading"));

  return (
    <Card className="mt-8 bg-blue-50 sm:p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-950">
          Bu hayale destek olmak ister misin?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-700">
          Bilgin, deneyimin veya bağlantılarınla bu fikrin gelişmesine katkı
          sağlayabilirsin.
        </p>
      </div>

      {loadingProfile ? (
        <p className="mt-6 text-center text-sm text-slate-600" role="status">
          Profil bilgileri yükleniyor...
        </p>
      ) : !user ? (
        <div className="mt-6 text-center">
          <Link href="/giris" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            Destek Ol
          </Link>
        </div>
      ) : accessState === "ineligible" ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-center text-slate-700">
          Bu fikir için destek başvurusu yalnızca destekçi veya mentor
          hesaplarıyla yapılabilir.
        </p>
      ) : accessState === "incomplete" ? (
        <div className="mt-6 rounded-xl bg-white p-4 text-center text-slate-700">
          <p>Destek başvurusu yapmadan önce profilini tamamlamalısın.</p>
          <Link href="/profil" className="mt-3 inline-flex font-semibold text-blue-800 underline">
            Profili Tamamla
          </Link>
        </div>
      ) : accessState === "error" ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-center text-red-800" role="alert">
          Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar dene.
        </p>
      ) : submitted ? (
        <p className="mt-6 rounded-xl bg-emerald-50 p-5 text-center font-semibold text-emerald-800" aria-live="polite">
          Destek başvurun alındı. Yönetim ekibi değerlendirdikten sonra seninle
          iletişime geçilecek.
        </p>
      ) : (
        <form className="mx-auto mt-7 max-w-2xl" onSubmit={(event) => void submit(event)}>
          <fieldset>
            <legend className="font-semibold text-slate-900">Destek türleri</legend>
            <p id="support-types-help" className="mt-1 text-sm text-slate-600">
              En az 1, en fazla 4 destek türü seç.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ENABLED_SUPPORT_TYPES.map((type) => (
                <label key={type} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={supportTypes.includes(type)}
                    disabled={submitting || (!supportTypes.includes(type) && supportTypes.length >= 4)}
                    aria-describedby="support-types-help"
                    onChange={() => toggleSupportType(type)}
                  />
                  {SUPPORT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor={`support-message-${ideaId}`} className="font-semibold text-slate-900">
              Mesajın
            </label>
            <Textarea
              id={`support-message-${ideaId}`}
              className="mt-2 bg-white"
              value={message}
              minLength={20}
              maxLength={1500}
              required
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `support-error-${ideaId}` : "support-message-help"}
              onChange={(event) => setMessage(event.target.value)}
            />
            <p id="support-message-help" className="mt-1 text-sm text-slate-600">
              20-1500 karakter. {message.length}/1500
            </p>
          </div>

          {error && (
            <p id={`support-error-${ideaId}`} className="mt-4 text-sm text-red-700" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          <Button className="mt-5 w-full sm:w-auto" type="submit" disabled={submitting || submitted}>
            {submitting ? "Başvuru gönderiliyor..." : "Destek Başvurusu Gönder"}
          </Button>
        </form>
      )}
    </Card>
  );
}
