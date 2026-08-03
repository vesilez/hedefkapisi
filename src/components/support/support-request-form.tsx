"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import type { UserRole } from "@/constants/roles";
import type {
  ContactPreference,
  SupportApplicationType,
} from "@/types/support-request";
import { CheckCircle2, HandHeart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AccessState =
  "loading" | "eligible" | "ineligible" | "incomplete" | "error";

const ENABLED_SUPPORT_TYPES = SUPPORT_TYPES.filter(
  (type) => type === "financial" || SUPPORT_TYPE_MVP_ENABLED[type],
);

type EligibleRole = Extract<UserRole, "supporter" | "mentor" | "sponsor">;

const ROLE_ACTIONS: Record<
  EligibleRole,
  { label: string; applicationType: SupportApplicationType }
> = {
  supporter: {
    label: "Bu hayale destek olmak istiyorum",
    applicationType: "support",
  },
  mentor: {
    label: "Mentorluk vermek istiyorum",
    applicationType: "mentorship",
  },
  sponsor: {
    label: "Sponsor olmak istiyorum",
    applicationType: "sponsorship",
  },
};

export function SupportRequestForm({ ideaId }: { ideaId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [eligibleRole, setEligibleRole] = useState<EligibleRole | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [supportTypes, setSupportTypes] = useState<SupportType[]>([]);
  const [message, setMessage] = useState("");
  const [contactPreference, setContactPreference] =
    useState<ContactPreference>("platform");
  const [contributionDetails, setContributionDetails] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [resources, setResources] = useState("");
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
      } else if (
        result.data.role !== "supporter" &&
        result.data.role !== "mentor" &&
        result.data.role !== "sponsor"
      ) {
        setAccessState("ineligible");
      } else if (
        result.data.role !== "sponsor" &&
        !result.data.profileCompleted
      ) {
        setAccessState("incomplete");
      } else {
        setEligibleRole(result.data.role);
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
      applicationType: eligibleRole
        ? ROLE_ACTIONS[eligibleRole].applicationType
        : "support",
      supportTypes,
      message,
      contactPreference,
      contributionDetails: contributionDetails.trim() || null,
      sponsorshipOffer:
        eligibleRole === "sponsor"
          ? { estimatedBudget, resources, duration: "Belirtilmedi" }
          : null,
    });
    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.",
      );
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
    (user !== null && (checkedUserId !== user.id || accessState === "loading"));

  return (
    <section className="mt-8" aria-labelledby={`support-title-${ideaId}`}>
      <Card className="overflow-hidden border-blue-200 bg-blue-50 shadow-lg shadow-blue-900/5 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-md shadow-blue-700/20">
            <HandHeart aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Birlikte geliştirelim
            </p>
            <h2
              id={`support-title-${ideaId}`}
              className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl"
            >
              Bu hayale destek olmak ister misin?
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-700">
              Bilgin, deneyimin veya bağlantılarınla bu fikrin gelişmesine katkı
              sağlayabilirsin.
            </p>
          </div>
        </div>

        {loadingProfile ? (
          <div
            className="mt-7 animate-pulse rounded-2xl bg-white p-5"
            role="status"
          >
            <span className="sr-only">Profil bilgileri yükleniyor...</span>
            <div aria-hidden="true" className="space-y-3">
              <div className="h-4 w-1/3 rounded-full bg-slate-200" />
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="h-24 rounded-xl bg-slate-100" />
            </div>
          </div>
        ) : !user ? (
          <div className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <p className="text-sm leading-6 text-slate-700">
              Destek başvurusu göndermek için hesabına giriş yap.
            </p>
            <Link
              href="/giris"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-blue-700 sm:mt-0 sm:w-auto"
            >
              Giriş Yap ve Destek Ol
            </Link>
          </div>
        ) : accessState === "ineligible" ? (
          <p className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 text-slate-700">
            Bu hayale başvuru destekçi, mentor veya sponsor hesabıyla
            yapılabilir.
          </p>
        ) : accessState === "incomplete" ? (
          <div className="mt-7 rounded-2xl border border-blue-100 bg-white p-5 text-slate-700">
            <p>Destek başvurusu yapmadan önce profilini tamamlamalısın.</p>
            <Link
              href="/profil"
              className="mt-3 inline-flex font-semibold text-blue-800 underline"
            >
              Profili Tamamla
            </Link>
          </div>
        ) : accessState === "error" ? (
          <p
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
            role="alert"
          >
            Profil bilgileri yüklenemedi. Lütfen daha sonra tekrar dene.
          </p>
        ) : submitted ? (
          <div
            className="mt-7 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"
            aria-live="polite"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
            />
            <p className="font-semibold">
              {eligibleRole === "sponsor"
                ? "Sponsorluk teklifin alındı. Yönetim ekibi değerlendirdikten sonra seninle iletişime geçilecek."
                : "Destek başvurun alındı. Yönetim ekibi değerlendirdikten sonra seninle iletişime geçilecek."}
            </p>
          </div>
        ) : !formOpen && eligibleRole ? (
          <div className="mt-7 rounded-2xl border border-blue-100 bg-white p-4 sm:p-6">
            <Button
              className="w-full sm:w-auto"
              type="button"
              onClick={() => setFormOpen(true)}
            >
              {ROLE_ACTIONS[eligibleRole].label}
            </Button>
          </div>
        ) : (
          <form
            className="mt-7 rounded-2xl border border-blue-100 bg-white p-4 sm:p-6"
            onSubmit={(event) => void submit(event)}
          >
            <fieldset>
              <legend className="font-semibold text-slate-900">
                Destek türleri
              </legend>
              <p
                id="support-types-help"
                className="mt-1 text-sm text-slate-600"
              >
                En az 1, en fazla 4 destek türü seç.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {ENABLED_SUPPORT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm font-medium hover:border-blue-300 hover:bg-blue-50 ${
                      supportTypes.includes(type)
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={supportTypes.includes(type)}
                      disabled={
                        submitting ||
                        (!supportTypes.includes(type) &&
                          supportTypes.length >= 4)
                      }
                      className="size-4 shrink-0 accent-blue-700 disabled:cursor-not-allowed"
                      aria-describedby="support-types-help"
                      onChange={() => toggleSupportType(type)}
                    />
                    {SUPPORT_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label
                htmlFor={`support-message-${ideaId}`}
                className="font-semibold text-slate-900"
              >
                {eligibleRole === "sponsor" ? "Teklif açıklaması" : "Mesajın"}
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
                aria-describedby={
                  error ? `support-error-${ideaId}` : "support-message-help"
                }
                onChange={(event) => setMessage(event.target.value)}
              />
              <p
                id="support-message-help"
                className="mt-1 text-sm text-slate-600"
              >
                20-1500 karakter. {message.length}/1500
              </p>
            </div>

            {eligibleRole === "sponsor" && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`estimated-budget-${ideaId}`}
                    className="font-semibold text-slate-900"
                  >
                    Tahmini bütçe
                  </label>
                  <Input
                    id={`estimated-budget-${ideaId}`}
                    className="mt-2"
                    value={estimatedBudget}
                    maxLength={120}
                    required
                    disabled={submitting}
                    placeholder="Örn. 100.000 TL veya ayni destek"
                    onChange={(event) => setEstimatedBudget(event.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`offer-resources-${ideaId}`}
                    className="font-semibold text-slate-900"
                  >
                    Sağlanacak kaynaklar
                  </label>
                  <Textarea
                    id={`offer-resources-${ideaId}`}
                    className="mt-2 bg-white"
                    value={resources}
                    minLength={10}
                    maxLength={1500}
                    required
                    disabled={submitting}
                    placeholder="Finansman, ekipman, uzman, mekân veya diğer kaynaklar"
                    onChange={(event) => setResources(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {eligibleRole !== "sponsor" && (
                <div>
                  <label
                    htmlFor={`contact-preference-${ideaId}`}
                    className="font-semibold text-slate-900"
                  >
                    İletişim tercihi
                  </label>
                  <Select
                    id={`contact-preference-${ideaId}`}
                    className="mt-2"
                    value={contactPreference}
                    disabled={submitting}
                    onChange={(event) =>
                      setContactPreference(
                        event.target.value as ContactPreference,
                      )
                    }
                  >
                    <option value="platform">Platform mesajları</option>
                    <option value="email">E-posta</option>
                    <option value="phone">Telefon</option>
                  </Select>
                </div>
              )}
              {eligibleRole !== "sponsor" && <div>
                <label
                  htmlFor={`contribution-details-${ideaId}`}
                  className="font-semibold text-slate-900"
                >
                  Bütçe veya katkı açıklaması
                  <span className="ml-1 font-normal text-slate-500">
                    (isteğe bağlı)
                  </span>
                </label>
                <Textarea
                  id={`contribution-details-${ideaId}`}
                  className="mt-2 bg-white"
                  value={contributionDetails}
                  maxLength={1000}
                  disabled={submitting}
                  onChange={(event) =>
                    setContributionDetails(event.target.value)
                  }
                />
                <p className="mt-1 text-sm text-slate-600">
                  {contributionDetails.length}/1000
                </p>
              </div>}
            </div>

            {error && (
              <p
                id={`support-error-${ideaId}`}
                className="mt-4 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            <Button
              className="mt-6 w-full sm:w-auto"
              type="submit"
              disabled={submitting || submitted}
            >
              {submitting && (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              )}
              {submitting
                ? "Başvuru gönderiliyor..."
                : eligibleRole === "sponsor"
                  ? "Sponsorluk Teklifini Gönder"
                  : "Destek Başvurusu Gönder"}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
