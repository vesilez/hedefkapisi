import { PageContainer } from "@/components/layout/page-container";
import { ProfileForm } from "@/components/profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Profilim | Hedef Kapısı" },
  description: "Hedef Kapısı profil bilgilerini tamamla ve güncelle.",
};

export default function ProfilePage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Profilim
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Profil bilgilerini tamamla; hayallerini paylaşmaya ve topluluğa katkı
          sunmaya başla.
        </p>
      </div>
      <ProfileForm />
    </PageContainer>
  );
}
