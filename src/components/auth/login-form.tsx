"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  loginSchema,
  type LoginFormValues,
} from "@/lib/validations/auth-schema";
import { loginWithEmailAndPassword } from "@/services/auth-service";
import { getUserAccessProfile } from "@/services/user-service";
import { AlertTriangle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface LoginSuccessState {
  emailVerified: boolean;
  redirectPath: "/admin" | "/profil";
}

export function LoginForm() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<LoginSuccessState | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loginSuccess || !user) return;

    if (loginSuccess.emailVerified) {
      router.replace(loginSuccess.redirectPath);
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace(loginSuccess.redirectPath);
    }, 2200);

    return () => window.clearTimeout(redirectTimer);
  }, [loginSuccess, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    if (loginSuccess) return;

    setServerError(null);
    const result = await loginWithEmailAndPassword(values);

    if (!result.success) {
      setServerError(result.error.message);
      return;
    }

    const profileResult = await getUserAccessProfile(result.data.id);
    const redirectPath =
      profileResult.success &&
      profileResult.data &&
      isAdminRole(profileResult.data.role)
        ? "/admin"
        : "/profil";

    setLoginSuccess({
      emailVerified: result.data.emailVerified,
      redirectPath,
    });
  });

  if (loginSuccess) {
    return (
      <Card className="mx-auto max-w-lg text-center" aria-live="polite">
        {loginSuccess.emailVerified ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="mx-auto size-7 animate-spin text-blue-700"
            />
            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Giriş başarılı
            </h2>
            <p className="mt-2 text-slate-600">
              {loginSuccess.redirectPath === "/admin"
                ? "Yönetim paneline yönlendiriliyorsun..."
                : "Profiline yönlendiriliyorsun..."}
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle aria-hidden="true" className="size-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-slate-950">
              E-posta doğrulaması gerekiyor
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              Hesabına giriş yapıldı. Güvenliğin için e-posta adresine
              gönderilen bağlantıdan adresini doğrulamanı öneriyoruz.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {loginSuccess.redirectPath === "/admin"
                ? "Yönetim paneline yönlendiriliyorsun..."
                : "Profiline yönlendiriliyorsun..."}
            </p>
            <Link
              href={loginSuccess.redirectPath}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              {loginSuccess.redirectPath === "/admin"
                ? "Yönetim Paneline Git"
                : "Şimdi Profile Git"}
            </Link>
          </>
        )}
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="mx-auto max-w-lg text-center" aria-live="polite">
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
      <Card className="mx-auto max-w-lg text-center">
        <h2 className="text-xl font-bold text-slate-950">Oturumun açık</h2>
        <p className="mt-3 leading-7 text-slate-600">
          Zaten giriş yapmış durumdasın. Profiline devam edebilirsin.
        </p>
        <Link
          href="/profil"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Profilime Git
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg p-5 sm:p-8">
      <form onSubmit={onSubmit} noValidate>
        <div
          className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 empty:hidden"
          role={serverError ? "alert" : undefined}
          aria-live="assertive"
        >
          {serverError}
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

        <div className="mt-5">
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
              autoComplete="current-password"
              className="pr-12"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
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

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            Beni hatırla
          </label>
          <Link
            href="/sifremi-unuttum"
            className="font-semibold text-blue-700 hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>

        <Button type="submit" className="mt-7 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 size-5 animate-spin"
              />
              Giriş yapılıyor...
            </>
          ) : (
            "Giriş Yap"
          )}
        </Button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Hesabın yok mu?{" "}
          <Link
            href="/kayit"
            className="font-semibold text-blue-700 hover:underline"
          >
            Kayıt ol
          </Link>
        </p>
      </form>
    </Card>
  );
}
