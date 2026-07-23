import { IdeaModerationList } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Hayaller | Hedef Kapısı" },
  description: "Platformda paylaşılan tüm hayalleri görüntüle.",
};

export default function AdminIdeasPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Hayaller
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Platformda paylaşılan tüm hayalleri ve güncel durumlarını görüntüle.
        </p>
      </div>
      <IdeaModerationList />
    </section>
  );
}
