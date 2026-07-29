import { AdminMentorships } from "@/components/mentorship";

export default function AdminMentorshipsPage() {
  return (
    <section>
      <h1 className="text-3xl font-black text-slate-950">Mentorluk Yönetimi</h1>
      <p className="mt-3 text-slate-600">
        Tüm mentorluk taleplerini, aktif eşleşmeleri ve tamamlanan çalışmaları
        yönet.
      </p>
      <div className="mt-8">
        <AdminMentorships />
      </div>
    </section>
  );
}
