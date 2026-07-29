"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { USER_ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  profileRepairSchema,
  PUBLIC_REGISTER_ROLES,
  type PublicRegisterRole,
} from "@/lib/validations/auth-schema";
import { createUserDocument } from "@/services/user-service";
import type { OrganizationType } from "@/types/sponsor";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ProfileRepairForm() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const displayParts = user?.displayName?.trim().split(/\s+/u) ?? [];
  const [role, setRole] = useState<PublicRegisterRole>("student");
  const [organizationType, setOrganizationType] =
    useState<OrganizationType>("company");
  const [supportAreas, setSupportAreas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const parsed = profileRepairSchema.safeParse({
      name: String(form.get("name") ?? ""),
      surname: String(form.get("surname") ?? ""),
      role,
      sponsorProfile:
        role === "sponsor"
          ? {
              organizationName: String(form.get("organizationName") ?? ""),
              organizationType,
              city: String(form.get("city") ?? ""),
              website: String(form.get("website") ?? ""),
              description: String(form.get("description") ?? ""),
              supportAreas: supportAreas
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createUserDocument({
      uid: user.id,
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      ...parsed.data,
    });
    if (result.success) {
      setCompleted(true);
      window.setTimeout(() => router.replace("/profil"), 900);
    } else {
      setError(result.error.message);
    }
    setSubmitting(false);
  }

  if (loading) return <Card><p>Oturum kontrol ediliyor...</p></Card>;
  if (!user) return <Card><p role="alert">Profil onarımı için giriş yapmalısınız.</p></Card>;
  if (completed) {
    return <Card className="text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-700" /><h2 className="mt-3 text-xl font-bold">Profiliniz oluşturuldu</h2><p className="mt-2 text-slate-600">Profil sayfasına yönlendiriliyorsunuz.</p></Card>;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Ad<Input name="name" required defaultValue={displayParts[0] ?? ""} /></label>
          <label className="grid gap-2 text-sm font-semibold">Soyad<Input name="surname" required defaultValue={displayParts.slice(1).join(" ")} /></label>
        </div>
        <fieldset>
          <legend className="text-sm font-bold">Hesap türü</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PUBLIC_REGISTER_ROLES.map((value) => (
              <label key={value} className={`cursor-pointer rounded-xl border p-3 font-semibold ${role === value ? "border-blue-700 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" className="sr-only" checked={role === value} onChange={() => setRole(value)} />
                {USER_ROLE_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        {role === "sponsor" && (
          <fieldset className="grid gap-4 rounded-2xl border border-blue-200 p-4">
            <legend className="px-2 font-bold">Kurum bilgileri</legend>
            <Input name="organizationName" required placeholder="Kurum adı" />
            <select value={organizationType} onChange={(event) => setOrganizationType(event.target.value as OrganizationType)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3">
              <option value="company">Şirket</option><option value="ngo">Dernek / STK</option><option value="foundation">Vakıf</option><option value="public_institution">Kamu kurumu</option><option value="university">Üniversite</option><option value="other">Diğer</option>
            </select>
            <Input name="city" required placeholder="Şehir" />
            <Input name="website" type="url" placeholder="Web sitesi" />
            <textarea name="description" required minLength={20} maxLength={1500} rows={5} className="rounded-xl border border-slate-300 bg-white p-3" placeholder="Kurum açıklaması" />
            <Input value={supportAreas} onChange={(event) => setSupportAreas(event.target.value)} required placeholder="Destek alanları (virgülle ayırın)" />
          </fieldset>
        )}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
        <Button type="submit" disabled={submitting}>{submitting ? "Profil oluşturuluyor..." : "Profili güvenle oluştur"}</Button>
      </form>
    </Card>
  );
}
