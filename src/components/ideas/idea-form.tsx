"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import {
  IDEA_STAGES,
  IDEA_STAGE_DESCRIPTIONS,
  IDEA_STAGE_LABELS,
} from "@/constants/idea-stages";
import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_LABELS,
  SUPPORT_TYPE_MVP_ENABLED,
} from "@/constants/support-types";
import { useAuth } from "@/hooks/use-auth";
import {
  ideaFormSchema,
  type IdeaFormInput,
} from "@/lib/validations/idea-schema";
import { createIdea } from "@/services/idea-service";
import { getUserProfile } from "@/services/user-service";
import type { IdeaSubmitAction, IdeaVisibility } from "@/types/idea";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

const ENABLED_SUPPORT_TYPES = SUPPORT_TYPES.filter(
  (supportType) => SUPPORT_TYPE_MVP_ENABLED[supportType],
);

const VISIBILITY_OPTIONS: ReadonlyArray<{
  value: IdeaVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "public",
    label: "Herkese Açık",
    description: "Fikrin ve öğrenci adın herkese görünür.",
  },
  {
    value: "anonymous",
    label: "Öğrenci Adı Gizli",
    description: "Fikrin görünür, öğrenci adın gizli tutulur.",
  },
  {
    value: "private",
    label: "Yalnızca Yönetim Görsün",
    description: "Fikri yalnızca yönetim ekibi görüntüleyebilir.",
  },
];

type AccessState = "loading" | "allowed" | "missing-profile" | "wrong-role";

export function IdeaForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [accessState, setAccessState] = useState<AccessState>("loading");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<IdeaSubmitAction | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [createdIdeaId, setCreatedIdeaId] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IdeaFormInput, unknown, IdeaFormInput>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      description: "",
      problem: "",
      solution: "",
      targetAudience: "",
      categoryId: "",
      city: "",
      stage: "dream",
      supportNeeds: [],
      visibility: "public",
      coverImageUrl: null,
      attachmentUrls: [],
      prototypeUrl: "",
      githubUrl: "",
      websiteUrl: "",
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getUserProfile(user.id).then((result) => {
      if (!active) return;

      if (!result.success) {
        setAccessError(result.error.message);
        setAccessState("missing-profile");
      } else if (!result.data) {
        setAccessError(
          "Profil kaydınız bulunamadı. Önce profilinizi tamamlayın.",
        );
        setAccessState("missing-profile");
      } else if (!result.data.profileCompleted) {
        router.replace("/profil");
      } else if (result.data.role !== "student") {
        setAccessState("wrong-role");
      } else {
        setAccessState("allowed");
      }
    });

    return () => {
      active = false;
    };
  }, [loading, router, user]);

  async function submitIdea(action: IdeaSubmitAction) {
    if (!user || isSubmitting || createdIdeaId) return;

    await handleSubmit(async (values) => {
      setActiveAction(action);
      setFeedback(null);

      const result = await createIdea(user.id, {
        ...values,
        submitAction: action,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error.message });
        setActiveAction(null);
        return;
      }

      setCreatedIdeaId(result.data.id);
      setFeedback({
        type: "success",
        message:
          action === "draft"
            ? "Fikrin taslak olarak kaydedildi."
            : "Fikrin değerlendirilmek üzere gönderildi.",
      });
      setActiveAction(null);
    })();
  }

  if (loading || accessState === "loading") {
    return (
      <Card className="mx-auto max-w-4xl text-center" aria-live="polite">
        <LoaderCircle
          className="mx-auto size-7 animate-spin text-blue-700"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm text-slate-600">
          Profil kontrol ediliyor...
        </p>
      </Card>
    );
  }

  if (!user) return null;

  if (accessState === "missing-profile") {
    return (
      <Card className="mx-auto max-w-4xl" aria-live="polite">
        <p role="alert" className="text-red-800">
          {accessError ?? "Profil bilgileri yüklenemedi."}
        </p>
        <Link
          href="/profil"
          className="mt-4 inline-block font-semibold text-blue-800 underline"
        >
          Profilime Git
        </Link>
      </Card>
    );
  }

  if (accessState === "wrong-role") {
    return (
      <Card className="mx-auto max-w-4xl" aria-live="polite">
        <p role="alert" className="text-slate-800">
          Bu alan yalnızca öğrenciler içindir.
        </p>
      </Card>
    );
  }

  const submitDisabled = isSubmitting || createdIdeaId !== null;

  return (
    <Card className="mx-auto max-w-5xl p-5 sm:p-8">
      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "mb-8 rounded-xl bg-emerald-50 p-4 text-emerald-800"
              : "mb-8 rounded-xl bg-red-50 p-4 text-red-800"
          }
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {feedback.type === "success" && (
              <CheckCircle2 className="mt-0.5 size-5" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.type === "success" && (
                <Link
                  href="/profil"
                  className="mt-2 inline-block text-sm font-semibold underline"
                >
                  Fikirlerime Git
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <form noValidate>
        <section>
          <h2 className="text-xl font-bold text-slate-950">
            1. Temel Bilgiler
          </h2>
          <div className="mt-5 grid gap-5">
            <div>
              <label
                htmlFor="title"
                className="text-sm font-semibold text-slate-800"
              >
                Hayal / fikir başlığı
              </label>
              <Input
                id="title"
                className="mt-2"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                {...register("title")}
              />
              {errors.title && (
                <p id="title-error" className="mt-1 text-sm text-red-700">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="shortDescription"
                className="text-sm font-semibold text-slate-800"
              >
                Kısa açıklama
              </label>
              <Textarea
                id="shortDescription"
                className="mt-2 min-h-24"
                aria-invalid={Boolean(errors.shortDescription)}
                aria-describedby={
                  errors.shortDescription
                    ? "short-description-error"
                    : undefined
                }
                {...register("shortDescription")}
              />
              {errors.shortDescription && (
                <p
                  id="short-description-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {errors.shortDescription.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="description"
                className="text-sm font-semibold text-slate-800"
              >
                Detaylı açıklama
              </label>
              <Textarea
                id="description"
                className="mt-2 min-h-44"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? "description-error" : undefined
                }
                {...register("description")}
              />
              {errors.description && (
                <p id="description-error" className="mt-1 text-sm text-red-700">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-950">
            2. Problem ve Çözüm
          </h2>
          <div className="mt-5 grid gap-5">
            {(
              [
                ["problem", "Hangi problemi çözüyor?"],
                ["solution", "Çözüm önerisi"],
                ["targetAudience", "Hedef kitle"],
              ] as const
            ).map(([name, label]) => (
              <div key={name}>
                <label
                  htmlFor={name}
                  className="text-sm font-semibold text-slate-800"
                >
                  {label}
                </label>
                <Textarea
                  id={name}
                  className={
                    name === "targetAudience" ? "mt-2 min-h-24" : "mt-2"
                  }
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  {...register(name)}
                />
                {errors[name] && (
                  <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
                    {errors[name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-950">
            3. Kategori ve Aşama
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="categoryId"
                className="text-sm font-semibold text-slate-800"
              >
                Kategori
              </label>
              <Select
                id="categoryId"
                className="mt-2"
                aria-invalid={Boolean(errors.categoryId)}
                aria-describedby={
                  errors.categoryId ? "category-error" : undefined
                }
                {...register("categoryId")}
              >
                <option value="">Kategori seçin</option>
                {DEFAULT_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
              {errors.categoryId && (
                <p id="category-error" className="mt-1 text-sm text-red-700">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="city"
                className="text-sm font-semibold text-slate-800"
              >
                Şehir
              </label>
              <Input
                id="city"
                className="mt-2"
                aria-invalid={Boolean(errors.city)}
                aria-describedby={errors.city ? "city-error" : undefined}
                {...register("city")}
              />
              {errors.city && (
                <p id="city-error" className="mt-1 text-sm text-red-700">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="stage"
                className="text-sm font-semibold text-slate-800"
              >
                Fikir aşaması
              </label>
              <Select
                id="stage"
                className="mt-2"
                aria-invalid={Boolean(errors.stage)}
                aria-describedby={
                  errors.stage ? "stage-error" : "stage-description"
                }
                {...register("stage")}
              >
                {IDEA_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {IDEA_STAGE_LABELS[stage]} —{" "}
                    {IDEA_STAGE_DESCRIPTIONS[stage]}
                  </option>
                ))}
              </Select>
              <p id="stage-description" className="mt-2 text-sm text-slate-600">
                Fikrinin şu an bulunduğu aşamayı seç.
              </p>
              {errors.stage && (
                <p id="stage-error" className="mt-1 text-sm text-red-700">
                  {errors.stage.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <Controller
            name="supportNeeds"
            control={control}
            render={({ field }) => (
              <fieldset
                aria-invalid={Boolean(errors.supportNeeds)}
                aria-describedby={
                  errors.supportNeeds
                    ? "support-needs-error"
                    : "support-needs-help"
                }
              >
                <legend className="text-xl font-bold text-slate-950">
                  4. Destek İhtiyaçları
                </legend>
                <p
                  id="support-needs-help"
                  className="mt-2 text-sm text-slate-600"
                >
                  En az 1, en fazla 6 destek türü seç.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ENABLED_SUPPORT_TYPES.map((supportType) => (
                    <label
                      key={supportType}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        value={supportType}
                        checked={field.value.includes(supportType)}
                        onBlur={field.onBlur}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? [...field.value, supportType]
                              : field.value.filter(
                                  (value) => value !== supportType,
                                ),
                          )
                        }
                        className="size-4"
                      />
                      {SUPPORT_TYPE_LABELS[supportType]}
                    </label>
                  ))}
                </div>
                {errors.supportNeeds && (
                  <p
                    id="support-needs-error"
                    className="mt-2 text-sm text-red-700"
                  >
                    {errors.supportNeeds.message}
                  </p>
                )}
              </fieldset>
            )}
          />
        </section>

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-slate-950">
            5. Görünürlük ve Bağlantılar
          </h2>
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-800">
                  Görünürlük
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        <input
                          type="radio"
                          value={option.value}
                          checked={field.value === option.value}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(option.value)}
                        />
                        {option.label}
                      </span>
                      <span className="mt-2 block text-sm text-slate-600">
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.visibility && (
                  <p className="mt-2 text-sm text-red-700">
                    {errors.visibility.message}
                  </p>
                )}
              </fieldset>
            )}
          />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {(
              [
                ["prototypeUrl", "Prototip linki"],
                ["githubUrl", "GitHub linki"],
                ["websiteUrl", "Web sitesi linki"],
              ] as const
            ).map(([name, label]) => (
              <div key={name}>
                <label
                  htmlFor={name}
                  className="text-sm font-semibold text-slate-800"
                >
                  {label}
                </label>
                <Input
                  id={name}
                  type="url"
                  className="mt-2"
                  placeholder="https://"
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  {...register(name)}
                />
                {errors[name] && (
                  <p id={`${name}-error`} className="mt-1 text-sm text-red-700">
                    {errors[name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={submitDisabled}
            onClick={() => void submitIdea("draft")}
          >
            {activeAction === "draft" ? (
              <>
                <LoaderCircle
                  className="mr-2 size-5 animate-spin"
                  aria-hidden="true"
                />
                Taslak kaydediliyor...
              </>
            ) : (
              "Taslak Kaydet"
            )}
          </Button>
          <Button
            type="button"
            disabled={submitDisabled}
            onClick={() => void submitIdea("submit_for_review")}
          >
            {activeAction === "submit_for_review" ? (
              <>
                <LoaderCircle
                  className="mr-2 size-5 animate-spin"
                  aria-hidden="true"
                />
                Onaya gönderiliyor...
              </>
            ) : (
              "Onaya Gönder"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
