import { IdeaModerationList } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fikir Moderasyonu | Hedef Kapısı" },
  description: "Onay bekleyen öğrenci fikirlerini incele ve yönet.",
};

export default function AdminIdeasPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Fikir Moderasyonu
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Onay bekleyen öğrenci fikirlerini incele ve yayın durumunu yönet.
        </p>
      </div>
      <IdeaModerationList />
    </section>
  );
}
