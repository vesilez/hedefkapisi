import { AdminSidebar } from "@/components/layout/admin-sidebar";
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell md:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 bg-slate-100 px-4 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
