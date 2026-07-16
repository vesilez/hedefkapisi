import { LoginForm } from "@/components/auth";
import { PageContainer } from "@/components/layout/page-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Giriş Yap | Hedef Kapısı" },
  description: "Hedef Kapısı hesabına güvenli şekilde giriş yap.",
};

export default function LoginPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-lg text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Tekrar Hoş Geldin
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          Hayallerini geliştirmeye kaldığın yerden devam et.
        </p>
      </div>
      <LoginForm />
    </PageContainer>
  );
}
