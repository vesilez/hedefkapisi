import { AdminSponsorApplications } from "@/components/sponsor";

export default function AdminSponsorsPage() {
  return <section><h1 className="text-3xl font-black text-slate-950">Sponsor Başvuruları</h1>
    <p className="mt-3 text-slate-600">Kurum profillerini inceleyin, onaylayın veya reddedin.</p>
    <div className="mt-8"><AdminSponsorApplications /></div></section>;
}
