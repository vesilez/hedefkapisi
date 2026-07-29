import { AdminFeedbackList } from "@/components/feedback";

export default function AdminFeedbackPage() {
  return (
    <section>
      <h1 className="text-3xl font-black text-slate-950">Geri Bildirimler</h1>
      <p className="mt-3 text-slate-600">Pilot kullanıcılarından gelen hata, öneri ve memnuniyet kayıtlarını yönetin.</p>
      <div className="mt-8"><AdminFeedbackList /></div>
    </section>
  );
}
