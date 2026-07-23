import { PageContainer } from "@/components/layout/page-container";
import { ProfileDashboard } from "@/components/profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Profilim | Hedef Kapısı" },
  description: "Hedef Kapısı profil bilgilerini görüntüle ve güncelle.",
};

export default function ProfilePage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Profilim
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Bilgilerini tamamla ve Hedef Kapısı deneyimini kişiselleştir.
        </p>
      </div>
      <ProfileDashboard />
    </PageContainer>
  );
}
