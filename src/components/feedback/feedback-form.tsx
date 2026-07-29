"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { feedbackInputSchema } from "@/lib/validations/feedback-schema";
import { createFeedback } from "@/services/feedback-service";
import type { FeedbackType } from "@/types/feedback";
import { CheckCircle2, LogIn, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";

const TYPE_OPTIONS: ReadonlyArray<{
  value: FeedbackType;
  label: string;
  description: string;
}> = [
  { value: "bug", label: "Hata", description: "Çalışmayan veya beklenmeyen davranış" },
  { value: "suggestion", label: "Öneri", description: "Platformu geliştirecek bir fikir" },
  { value: "satisfaction", label: "Memnuniyet", description: "İyi çalışan bir deneyim" },
];

export function FeedbackForm() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackType>("bug");
  const [pagePath, setPagePath] = useState(pathname);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = feedbackInputSchema.safeParse({
      type,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      pagePath,
    });
    if (!parsed.success) {
      setFeedback({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Alanları kontrol edin.",
      });
      return;
    }
    setSubmitting(true);
    const result = await createFeedback(parsed.data);
    if (result.success) {
      form.reset();
      setPagePath(pathname);
      setType("bug");
      setFeedback({
        kind: "success",
        message: "Geri bildiriminiz pilot ekibine ulaştı. Teşekkür ederiz.",
      });
    } else {
      setFeedback({ kind: "error", message: result.error.message });
    }
    setSubmitting(false);
  }

  if (loading) {
    return <Card><p className="animate-pulse text-slate-600">Oturum bilgileri kontrol ediliyor...</p></Card>;
  }
  if (!user) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <LogIn aria-hidden="true" className="mx-auto size-10 text-blue-700" />
        <h2 className="mt-4 text-2xl font-black text-slate-950">Giriş yapmanız gerekiyor</h2>
        <p className="mt-2 text-slate-600">Geri bildirimi hesabınızla ilişkilendirerek sonucu takip edebilmemizi sağlıyoruz.</p>
        <Link href="/giris" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white">Giriş yap</Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <MessageSquareText aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-slate-950">Deneyiminizi paylaşın</h2>
          <p className="mt-1 text-sm text-slate-600">Teknik bilgiler yerine ne yaptığınızı ve ne beklediğinizi yazın.</p>
        </div>
      </div>
      <form className="mt-7 grid gap-5" onSubmit={submit}>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-slate-800">Geri bildirim türü</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPE_OPTIONS.map((option) => (
              <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 ${type === option.value ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
                <input className="sr-only" type="radio" name="type" value={option.value} checked={type === option.value} onChange={() => setType(option.value)} />
                <span className="block font-bold text-slate-950">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Başlık
          <Input name="title" required minLength={5} maxLength={120} placeholder="Kısa ve açıklayıcı bir başlık" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          Açıklama
          <Textarea name="description" required minLength={15} maxLength={3000} rows={8} placeholder="Ne yaptınız, ne oldu ve ne olmasını bekliyordunuz?" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-800">
          İlgili sayfa
          <Input value={pagePath} onChange={(event) => setPagePath(event.target.value)} required maxLength={500} placeholder="/hayaller/..." />
        </label>
        <p className="text-xs leading-5 text-slate-500">Adınız, e-posta adresiniz ve gönderim tarihi otomatik eklenir. Şifre veya hassas kişisel bilgi paylaşmayın.</p>
        {feedback && (
          <p role={feedback.kind === "error" ? "alert" : "status"} className={`flex items-center gap-2 rounded-xl p-4 text-sm font-semibold ${feedback.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {feedback.kind === "success" && <CheckCircle2 aria-hidden="true" className="size-5" />}
            {feedback.message}
          </p>
        )}
        <Button type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Geri bildirimi gönder"}</Button>
      </form>
    </Card>
  );
}
