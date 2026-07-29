import { ProfileRepairForm } from "@/components/auth/profile-repair-form";
import { PageContainer } from "@/components/layout/page-container";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Profil Tamamlama",
  description: "Eksik kullanıcı profilinizi güvenli şekilde tamamlayın.",
  path: "/profil-tamamlama",
  noIndex: true,
});

export default function ProfileRepairPage() {
  return (
    <PageContainer className="py-10 sm:py-16">
      <header className="mx-auto mb-7 max-w-2xl">
        <h1 className="text-3xl font-black text-slate-950">Profilinizi tamamlayın</h1>
        <p className="mt-3 leading-7 text-slate-600">Authentication hesabınız bulundu ancak Firestore profiliniz eksik. Rolünüzü doğrulayarak profilinizi yeniden oluşturabilirsiniz; yönetici yetkisi bu akıştan verilemez.</p>
      </header>
      <ProfileRepairForm />
    </PageContainer>
  );
}
