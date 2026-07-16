"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { USER_ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  PUBLIC_REGISTER_ROLES,
  type PublicRegisterRole,
} from "@/lib/validations/auth-schema";
import {
  registerFormSchema,
  type RegisterFormInput,
} from "@/lib/validations/register-form-schema";
import { registerWithEmailAndPassword } from "@/services/auth-service";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

const ROLE_DESCRIPTIONS: Record<PublicRegisterRole, string> = {
  student: "Hayalini veya fikrini paylaş.",
  supporter: "Fikirlere bilgi, bağlantı veya kaynak desteği sun.",
  mentor: "Deneyiminle öğrencilere yol göster.",
};

export function RegisterForm() {
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "student",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (registrationCompleted) return;

    setServerError(null);
    const input = {
      email: values.email,
      password: values.password,
      name: values.name,
      surname: values.surname,
      role: values.role,
    };
    const result = await registerWithEmailAndPassword(input);

    if (!result.success) {
      setServerError(result.error.message);
      return;
    }

    setRegistrationCompleted(true);
  });

  if (registrationCompleted) {
    return (
      <Card
        className="mx-auto max-w-2xl p-6 text-center sm:p-8"
        aria-live="polite"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-950">
          Kayıt işlemin tamamlandı
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          Kayıt işlemin tamamlandı. E-posta adresine gönderilen doğrulama
          bağlantısını kontrol et.
        </p>
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <Mail aria-hidden="true" className="mx-auto mb-2 size-5" />
          Gelen kutunun yanında spam veya gereksiz klasörünü de kontrol etmeyi
          unutma.
        </div>
        <Link
          href="/giris"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto"
        >
          Giriş Yap sayfasına git
        </Link>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-2xl text-center" aria-live="polite">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-6 animate-spin text-blue-700"
        />
        <p className="mt-3 text-sm text-slate-600">
          Oturum kontrol ediliyor...
        </p>
      </Card>
    );
  }

  if (user && !isSubmitting) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-bold text-slate-950">Oturumun açık</h2>
        <p className="mt-3 leading-7 text-slate-600">
          Zaten giriş yapmış durumdasın. Profiline veya ana sayfaya devam
          edebilirsin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/profil"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Profilime Git
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50"
          >
            Ana Sayfaya Git
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate>
        <div
          className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 empty:hidden"
          role={serverError ? "alert" : undefined}
          aria-live="assertive"
        >
          {serverError}
        </div>

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
              autoComplete="given-name"
              className="mt-2"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="name-error" className="mt-1.5 text-sm text-red-700">
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
              autoComplete="family-name"
              className="mt-2"
              aria-invalid={Boolean(errors.surname)}
              aria-describedby={errors.surname ? "surname-error" : undefined}
              {...register("surname")}
            />
            {errors.surname && (
              <p id="surname-error" className="mt-1.5 text-sm text-red-700">
                {errors.surname.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-800"
          >
            E-posta
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-2"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-sm text-red-700">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-800"
            >
              Şifre
            </label>
            <div className="relative mt-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-12"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-700"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-5" />
                ) : (
                  <Eye aria-hidden="true" className="size-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-slate-800"
            >
              Şifre tekrar
            </label>
            <div className="relative mt-2">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-12"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword ? "confirm-password-error" : undefined
                }
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-600 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-700"
                aria-label={
                  showConfirmPassword
                    ? "Şifre tekrarını gizle"
                    : "Şifre tekrarını göster"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff aria-hidden="true" className="size-5" />
                ) : (
                  <Eye aria-hidden="true" className="size-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirm-password-error"
                className="mt-1.5 text-sm text-red-700"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <fieldset
          className="mt-6"
          aria-describedby={errors.role ? "role-error" : undefined}
        >
          <legend className="text-sm font-semibold text-slate-800">
            Kullanıcı rolü
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PUBLIC_REGISTER_ROLES.map((role) => (
              <label key={role} className="cursor-pointer">
                <input
                  type="radio"
                  value={role}
                  className="peer sr-only"
                  {...register("role")}
                />
                <span className="block h-full rounded-xl border border-slate-300 p-4 transition peer-checked:border-blue-700 peer-checked:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-700">
                  <span className="block font-semibold text-slate-950">
                    {USER_ROLE_LABELS[role]}
                  </span>
                  <span className="mt-1.5 block text-sm leading-5 text-slate-600">
                    {ROLE_DESCRIPTIONS[role]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.role && (
            <p id="role-error" className="mt-1.5 text-sm text-red-700">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <Button
          type="submit"
          className="mt-7 w-full"
          disabled={isSubmitting || registrationCompleted}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 size-5 animate-spin"
              />
              Kayıt oluşturuluyor...
            </>
          ) : (
            "Kayıt Ol"
          )}
        </Button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Zaten hesabın var mı?{" "}
          <Link
            href="/giris"
            className="font-semibold text-blue-700 hover:underline"
          >
            Giriş Yap
          </Link>
        </p>
      </form>
    </Card>
  );
}
