import { PageContainer } from "@/components/layout/page-container";
import { NotificationList } from "@/components/notifications/notification-list";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bildirimler" };

export default function NotificationsPage() {
  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Bildirimler</h1>
        <p className="mt-2 text-slate-600">Hesabınızla ilgili son gelişmeleri takip edin.</p>
      </div>
      <NotificationList />
    </PageContainer>
  );
}
