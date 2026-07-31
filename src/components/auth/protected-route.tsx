"use client";

import { isAdminRole, type UserRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import { getUserAccessProfile } from "@/services/user-service";
import { LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type ProtectedArea = "admin" | "dashboard";

const DASHBOARD_ROLE_RULES: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: "/hayalini-paylas", roles: ["student"] },
  { prefix: "/fikirlerim", roles: ["student"] },
  { prefix: "/mentorluk", roles: ["student", "mentor"] },
  { prefix: "/sponsor/dashboard", roles: ["sponsor"] },
  { prefix: "/sponsor-paneli", roles: ["sponsor"] },
  {
    prefix: "/mesajlar",
    roles: ["student", "supporter", "mentor", "sponsor", "admin", "superadmin"],
  },
  {
    prefix: "/favorilerim",
    roles: ["student", "supporter", "mentor", "sponsor"],
  },
  {
    prefix: "/profil",
    roles: ["student", "supporter", "mentor", "sponsor"],
  },
];

function permittedDashboardRole(pathname: string, role: UserRole) {
  const rule = DASHBOARD_ROLE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return rule ? rule.roles.includes(role) : !isAdminRole(role);
}

export function ProtectedRoute({
  area,
  children,
}: {
  area: ProtectedArea;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [allowedPath, setAllowedPath] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/giris");
      return;
    }

    if (pathname === "/profil-tamamlama") {
      return;
    }

    let active = true;

    void getUserAccessProfile(user.id).then((result) => {
      if (!active) return;

      if (!result.success || !result.data) {
        router.replace(area === "dashboard" ? "/profil-tamamlama" : "/");
        return;
      }

      const role = result.data.role;
      const allowed =
        area === "admin"
          ? isAdminRole(role)
          : permittedDashboardRole(pathname, role);

      if (allowed) {
        setAllowedPath(pathname);
        return;
      }

      router.replace(
        pathname === "/sponsor/dashboard"
          ? "/"
          : isAdminRole(role)
            ? "/admin"
            : "/profil",
      );
    });

    return () => {
      active = false;
    };
  }, [area, loading, pathname, router, user]);

  const accessAllowed =
    (!loading && Boolean(user) && pathname === "/profil-tamamlama") ||
    allowedPath === pathname;

  if (!accessAllowed) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="size-7 animate-spin text-blue-700"
          aria-hidden="true"
        />
        <span className="sr-only">Erişim kontrol ediliyor...</span>
      </div>
    );
  }

  return children;
}
