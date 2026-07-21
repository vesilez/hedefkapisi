import { ForgotPasswordForm } from "@/components/auth";
import { PageContainer } from "@/components/layout/page-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Şifremi Unuttum | Hedef Kapısı" },
  description: "Hedef Kapısı hesabın için şifre sıfırlama bağlantısı iste.",
};

export default function ForgotPasswordPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-lg text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Şifremi Unuttum
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          E-posta adresini gir, şifreni yenilemen için sana bir bağlantı
          gönderelim.
        </p>
      </div>
      <ForgotPasswordForm />
    </PageContainer>
  );
}
