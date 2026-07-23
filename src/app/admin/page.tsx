import { AdminOverview } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Genel Bakış | Hedef Kapısı" },
  description: "Platform istatistiklerini ve bekleyen işlemleri görüntüle.",
};

export default function AdminPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Genel Bakış
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Platformun güncel istatistiklerini ve bekleyen işlemlerini takip et.
        </p>
      </div>
      <AdminOverview />
    </section>
  );
}
