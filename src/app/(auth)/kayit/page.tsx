import { RegisterForm } from "@/components/auth";
import { PageContainer } from "@/components/layout/page-container";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Kayıt Ol | Hedef Kapısı" },
  description: "Hedef Kapısı’na öğrenci, destekçi veya mentor olarak kayıt ol.",
};

export default function RegisterPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Hedef Kapısı’na Katıl
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          Hayalini paylaş, destek bul ve fikrini projeye dönüştür.
        </p>
      </div>
      <RegisterForm />
    </PageContainer>
  );
}
