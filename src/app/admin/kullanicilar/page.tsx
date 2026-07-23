import { UserManagementList } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Kullanıcı Yönetimi | Hedef Kapısı" },
  description: "Platform kullanıcılarını, rollerini ve durumlarını yönet.",
};

export default function AdminUsersPage() {
  return (
    <section>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Kullanıcı Yönetimi
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Platform kullanıcılarını, rollerini ve hesap durumlarını yönet.
        </p>
      </div>
      <UserManagementList />
    </section>
  );
}
