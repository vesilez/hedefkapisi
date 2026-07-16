"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { USER_ROLE_LABELS } from "@/constants/roles";
import { SUPPORT_TYPES, SUPPORT_TYPE_LABELS } from "@/constants/support-types";
import { useAuth } from "@/hooks/use-auth";
import { PUBLIC_REGISTER_ROLES } from "@/lib/validations/auth-schema";
import {
  isProfileRole,
  profileFormSchema,
  type ProfileFormInput,
  type ProfileFormValues,
} from "@/lib/validations/profile-form-schema";
import {
  createOrUpdateUserProfile,
  getUserProfile,
} from "@/services/user-service";
import {
  SCHOOL_TYPES,
  SUPPORTER_TYPES,
  type UserWithProfiles,
} from "@/types/user";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

const SCHOOL_TYPE_LABELS = {
  high_school: "Lise",
  university: "Üniversite",
  graduate: "Lisansüstü",
  other: "Diğer",
} as const;

const SUPPORTER_TYPE_LABELS = {
  individual: "Bireysel",
  company: "Şirket",
  ngo: "Sivil toplum kuruluşu",
  public_institution: "Kamu kurumu",
  university: "Üniversite",
  other: "Diğer",
} as const;

function emptyValues(
  email: string,
  displayName: string | null,
): ProfileFormInput {
  const nameParts = displayName?.trim().split(/\s+/) ?? [];

  return {
    name: nameParts[0] ?? "",
    surname: nameParts.slice(1).join(" "),
    email,
    phone: "",
    city: "",
    role: "student",
    bio: "",
    schoolType: "high_school",
    schoolName: "",
    department: "",
    grade: "",
    dateOfBirth: "",
    guardianApprovalRequired: false,
    supporterType: "individual",
    organizationName: "",
    title: "",
    expertiseAreas: [],
    supportTypes: [],
    company: "",
    website: "",
    linkedin: "",
  };
}

function valuesFromProfile(
  profile: UserWithProfiles,
): ProfileFormValues | null {
  if (!isProfileRole(profile.role)) return null;

  const roleProfile =
    profile.role === "student"
      ? profile.studentProfile
      : profile.role === "supporter"
        ? profile.supporterProfile
        : profile.mentorProfile;

  return {
    name: profile.name,
    surname: profile.surname,
    email: profile.email,
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    role: profile.role,
    bio: roleProfile?.bio ?? "",
    schoolType: profile.studentProfile?.schoolType ?? "high_school",
    schoolName: profile.studentProfile?.schoolName ?? "",
    department: profile.studentProfile?.department ?? "",
    grade: profile.studentProfile?.grade ?? "",
    dateOfBirth: profile.studentProfile?.dateOfBirth ?? null,
    guardianApprovalRequired:
      profile.studentProfile?.guardianApprovalRequired ?? false,
    supporterType: profile.supporterProfile?.supporterType ?? "individual",
    organizationName: profile.supporterProfile?.organizationName ?? "",
    title:
      profile.supporterProfile?.title ?? profile.mentorProfile?.title ?? "",
    expertiseAreas:
      profile.supporterProfile?.expertiseAreas ??
      profile.mentorProfile?.expertiseAreas ??
      [],
    supportTypes: profile.supporterProfile?.supportTypes ?? [],
    company: profile.mentorProfile?.company ?? "",
    website:
      profile.supporterProfile?.website ?? profile.mentorProfile?.website ?? "",
    linkedin:
      profile.supporterProfile?.linkedin ??
      profile.mentorProfile?.linkedin ??
      "",
  };
}

export function ProfileForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: emptyValues("", null),
  });
  const role = useWatch({ control, name: "role" });

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
        setFeedback({ type: "error", message: result.error.message });
      } else if (result.data) {
        const values = valuesFromProfile(result.data);
        if (values) {
          reset(values);
        } else {
          setFeedback({
            type: "error",
            message: "Bu kullanıcı rolü profil formundan düzenlenemez.",
          });
        }
      } else {
        reset(emptyValues(user.email ?? "", user.displayName));
      }

      setProfileLoading(false);
    });

    return () => {
      active = false;
    };
  }, [loading, reset, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;

    setFeedback(null);
    const result = await createOrUpdateUserProfile(user.id, {
      ...values,
      email: user.email ?? values.email,
      emailVerified: user.emailVerified,
      avatarUrl: user.photoURL,
    });

    setFeedback(
      result.success
        ? { type: "success", message: "Profilin başarıyla kaydedildi." }
        : { type: "error", message: result.error.message },
    );
  });

  if (loading || profileLoading) {
    return (
      <Card className="text-center" aria-live="polite">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-7 animate-spin text-blue-700"
        />
        <p className="mt-3 text-sm text-slate-600">Profil yükleniyor...</p>
      </Card>
    );
  }

  if (!user) return null;

  return (
    <Card className="p-5 sm:p-8">
      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "mb-6 rounded-xl bg-emerald-50 p-4 text-emerald-800"
              : "mb-6 rounded-xl bg-red-50 p-4 text-red-800"
          }
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {feedback.type === "success" && (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5" />
            )}
            <div>
              <p className="font-semibold">{feedback.message}</p>
              {feedback.type === "success" && (
                <Link
                  href="/hayalini-paylas"
                  className="mt-2 inline-block text-sm font-semibold underline"
                >
                  Hayalini Paylaş
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-semibold text-slate-800"
            >
              Ad
            </label>
            <Input
              id="name"
              className="mt-2"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="profile-name-error" className="mt-1 text-sm text-red-700">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="surname"
              className="text-sm font-semibold text-slate-800"
            >
              Soyad
            </label>
            <Input
              id="surname"
              className="mt-2"
              aria-invalid={Boolean(errors.surname)}
              aria-describedby={
                errors.surname ? "profile-surname-error" : undefined
              }
              {...register("surname")}
            />
            {errors.surname && (
              <p
                id="profile-surname-error"
                className="mt-1 text-sm text-red-700"
              >
                {errors.surname.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-800"
            >
              E-posta
            </label>
            <Input
              id="email"
              className="mt-2 bg-slate-100"
              readOnly
              aria-readonly="true"
              {...register("email")}
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="text-sm font-semibold text-slate-800"
            >
              Telefon
            </label>
            <Input
              id="phone"
              className="mt-2"
              type="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? "profile-phone-error" : undefined
              }
              {...register("phone")}
            />
            {errors.phone && (
              <p id="profile-phone-error" className="mt-1 text-sm text-red-700">
                {errors.phone.message}
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
              aria-describedby={errors.city ? "profile-city-error" : undefined}
              {...register("city")}
            />
            {errors.city && (
              <p id="profile-city-error" className="mt-1 text-sm text-red-700">
                {errors.city.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="role"
              className="text-sm font-semibold text-slate-800"
            >
              Rol
            </label>
            <Select id="role" className="mt-2" {...register("role")}>
              {PUBLIC_REGISTER_ROLES.map((profileRole) => (
                <option key={profileRole} value={profileRole}>
                  {USER_ROLE_LABELS[profileRole]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="bio" className="text-sm font-semibold text-slate-800">
            Kısa biyografi
          </label>
          <Textarea
            id="bio"
            className="mt-2"
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? "profile-bio-error" : undefined}
            {...register("bio")}
          />
          {errors.bio && (
            <p id="profile-bio-error" className="mt-1 text-sm text-red-700">
              {errors.bio.message}
            </p>
          )}
        </div>

        {role === "student" && (
          <section className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-950">
              Öğrenci bilgileri
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="schoolType"
                  className="text-sm font-semibold text-slate-800"
                >
                  Okul türü
                </label>
                <Select
                  id="schoolType"
                  className="mt-2"
                  aria-invalid={Boolean(errors.schoolType)}
                  aria-describedby={
                    errors.schoolType ? "school-type-error" : undefined
                  }
                  {...register("schoolType")}
                >
                  {SCHOOL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SCHOOL_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
                {errors.schoolType && (
                  <p
                    id="school-type-error"
                    className="mt-1 text-sm text-red-700"
                  >
                    {errors.schoolType.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="schoolName"
                  className="text-sm font-semibold text-slate-800"
                >
                  Okul adı
                </label>
                <Input
                  id="schoolName"
                  className="mt-2"
                  aria-invalid={Boolean(errors.schoolName)}
                  aria-describedby={
                    errors.schoolName ? "school-name-error" : undefined
                  }
                  {...register("schoolName")}
                />
                {errors.schoolName && (
                  <p
                    id="school-name-error"
                    className="mt-1 text-sm text-red-700"
                  >
                    {errors.schoolName.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="department"
                  className="text-sm font-semibold text-slate-800"
                >
                  Bölüm
                </label>
                <Input
                  id="department"
                  className="mt-2"
                  {...register("department")}
                />
              </div>
              <div>
                <label
                  htmlFor="grade"
                  className="text-sm font-semibold text-slate-800"
                >
                  Sınıf
                </label>
                <Input id="grade" className="mt-2" {...register("grade")} />
              </div>
              <div>
                <label
                  htmlFor="dateOfBirth"
                  className="text-sm font-semibold text-slate-800"
                >
                  Doğum tarihi
                </label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="mt-2"
                  {...register("dateOfBirth")}
                />
              </div>
              <label className="flex items-center gap-3 self-end pb-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="size-4"
                  {...register("guardianApprovalRequired")}
                />
                Veli onayı gerekli
              </label>
            </div>
          </section>
        )}

        {(role === "supporter" || role === "mentor") && (
          <section className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-950">
              {role === "supporter" ? "Destekçi bilgileri" : "Mentor bilgileri"}
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {role === "supporter" && (
                <>
                  <div>
                    <label
                      htmlFor="supporterType"
                      className="text-sm font-semibold text-slate-800"
                    >
                      Destekçi türü
                    </label>
                    <Select
                      id="supporterType"
                      className="mt-2"
                      aria-invalid={Boolean(errors.supporterType)}
                      aria-describedby={
                        errors.supporterType
                          ? "supporter-type-error"
                          : undefined
                      }
                      {...register("supporterType")}
                    >
                      {SUPPORTER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {SUPPORTER_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </Select>
                    {errors.supporterType && (
                      <p
                        id="supporter-type-error"
                        className="mt-1 text-sm text-red-700"
                      >
                        {errors.supporterType.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="organizationName"
                      className="text-sm font-semibold text-slate-800"
                    >
                      Kurum adı
                    </label>
                    <Input
                      id="organizationName"
                      className="mt-2"
                      {...register("organizationName")}
                    />
                  </div>
                </>
              )}
              {role === "mentor" && (
                <div>
                  <label
                    htmlFor="company"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Şirket
                  </label>
                  <Input
                    id="company"
                    className="mt-2"
                    {...register("company")}
                  />
                </div>
              )}
              <div>
                <label
                  htmlFor="title"
                  className="text-sm font-semibold text-slate-800"
                >
                  Ünvan
                </label>
                <Input id="title" className="mt-2" {...register("title")} />
              </div>
              <div>
                <label
                  htmlFor="website"
                  className="text-sm font-semibold text-slate-800"
                >
                  Website
                </label>
                <Input
                  id="website"
                  type="url"
                  className="mt-2"
                  aria-invalid={Boolean(errors.website)}
                  aria-describedby={
                    errors.website ? "website-error" : undefined
                  }
                  {...register("website")}
                />
                {errors.website && (
                  <p id="website-error" className="mt-1 text-sm text-red-700">
                    {errors.website.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="linkedin"
                  className="text-sm font-semibold text-slate-800"
                >
                  LinkedIn
                </label>
                <Input
                  id="linkedin"
                  type="url"
                  className="mt-2"
                  aria-invalid={Boolean(errors.linkedin)}
                  aria-describedby={
                    errors.linkedin ? "linkedin-error" : undefined
                  }
                  {...register("linkedin")}
                />
                {errors.linkedin && (
                  <p id="linkedin-error" className="mt-1 text-sm text-red-700">
                    {errors.linkedin.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="expertiseAreas"
                className="text-sm font-semibold text-slate-800"
              >
                Uzmanlık alanları
              </label>
              <Controller
                name="expertiseAreas"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="expertiseAreas"
                    className="mt-2 min-h-24"
                    placeholder="Her satıra bir uzmanlık alanı yazın"
                    aria-invalid={Boolean(errors.expertiseAreas)}
                    aria-describedby={
                      errors.expertiseAreas
                        ? "expertise-areas-error"
                        : undefined
                    }
                    value={(field.value ?? []).join("\n")}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value
                          .split(/[\n,]/)
                          .map((value) => value.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                )}
              />
              {errors.expertiseAreas && (
                <p
                  id="expertise-areas-error"
                  className="mt-1 text-sm text-red-700"
                >
                  {errors.expertiseAreas.message}
                </p>
              )}
            </div>

            {role === "supporter" && (
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-slate-800">
                  Destek türleri
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SUPPORT_TYPES.map((supportType) => (
                    <label
                      key={supportType}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        value={supportType}
                        className="size-4"
                        {...register("supportTypes")}
                      />
                      {SUPPORT_TYPE_LABELS[supportType]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>
        )}

        <Button
          type="submit"
          className="mt-8 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 size-5 animate-spin"
              />
              Profil kaydediliyor...
            </>
          ) : (
            "Profili Kaydet"
          )}
        </Button>
      </form>
    </Card>
  );
}
