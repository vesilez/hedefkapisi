import { ProtectedRoute } from "@/components/auth/protected-route";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedRoute area="dashboard">{children}</ProtectedRoute>;
}
