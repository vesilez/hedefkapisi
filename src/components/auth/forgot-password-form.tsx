"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth-schema";
import { sendPasswordReset } from "@/services/auth-service";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function ForgotPasswordForm() {
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    console.log("FORM SUBMIT ÇALIŞTI", values);
    setFeedback(null);
    const result = await sendPasswordReset(values);
    console.log("RESET RESULT:", result);
    setFeedback(
      result.success
        ? {
            type: "success",
            message:
              "Şifre sıfırlama bağlantısı e-posta adresine gönderildi.",
          }
        : { type: "error", message: result.error.message },
    );
  });

  return (
    <Card className="mx-auto max-w-lg p-5 sm:p-8">
      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
              : "mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          }
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.type === "success" && (
            <CheckCircle2
              aria-hidden="true"
              className="mr-2 inline size-5 align-text-bottom"
            />
          )}
          {feedback.message}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="reset-email" className="text-sm font-semibold text-slate-800">
          E-posta
        </label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          className="mt-2"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "reset-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="reset-email-error" className="mt-1.5 text-sm text-red-700">
            {errors.email.message}
          </p>
        )}

        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 size-5 animate-spin"
              />
              Gönderiliyor...
            </>
          ) : (
            "Sıfırlama Bağlantısı Gönder"
          )}
        </Button>
      </form>
    </Card>
  );
}
