import { AdminMeetings } from "@/components/meetings";

export default function AdminMeetingsPage() {
  return <section><h1 className="text-3xl font-black text-slate-950">Toplantılar</h1><p className="mt-3 text-slate-600">Platformdaki planlı görüşmeleri görüntüle ve yönet.</p><div className="mt-8"><AdminMeetings /></div></section>;
}
