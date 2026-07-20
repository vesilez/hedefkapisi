import { SupportRequestList } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Destek Başvuruları | Hedef Kapısı" },
  description: "Fikirlere yapılan destek başvurularını incele ve yönet.",
};

export default function AdminSupportRequestsPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Destek Başvuruları
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Fikirlere yapılan destek taleplerini incele ve süreci yönet.
        </p>
      </div>
      <SupportRequestList />
    </section>
  );
}
