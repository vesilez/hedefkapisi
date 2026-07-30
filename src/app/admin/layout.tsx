import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedRoute area="admin">
      <div className="admin-shell md:flex">
        <AdminSidebar />
        <main className="min-w-0 flex-1 bg-slate-100 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
