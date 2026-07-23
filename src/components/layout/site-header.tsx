"use client";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { mainNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getUserAccessProfile } from "@/services/user-service";
import type { UserRole } from "@/constants/roles";
import { PageContainer } from "./page-container";
import { NotificationBell } from "./notification-bell";

export function SiteHeader() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileAccess, setProfileAccess] = useState<{
    userId: string;
    role: UserRole | null;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let active = true;
    void getUserAccessProfile(user.id).then((result) => {
      if (!active) return;
      setProfileAccess({
        userId: user.id,
        role: result.success ? (result.data?.role ?? null) : null,
      });
    });

    return () => {
      active = false;
    };
  }, [loading, user]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    const result = await logout();
    if (result.success) router.push("/");
    setLoggingOut(false);
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <PageContainer className="flex min-h-18 items-center justify-between gap-5">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-blue-900"
        >
          {siteConfig.name}
        </Link>
        <nav
          aria-label="Ana menü"
          className="hidden items-center gap-1 lg:flex"
        >
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {!loading && user && (
          <div className="ml-auto">
            <NotificationBell userId={user.id} />
          </div>
        )}
        <div
          className={`hidden items-center gap-2 lg:flex ${
            !user ? "ml-auto" : ""
          }`}
        >
          {!loading &&
            (user ? (
              <>
                {profileAccess?.userId === user.id &&
                  profileAccess.role === "student" && (
                    <Link
                      href="/fikirlerim"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                    >
                      Fikirlerim
                    </Link>
                  )}
                <Link
                  href="/profil"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  Profilim
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/giris"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Kayıt Ol
                </Link>
              </>
            ))}
        </div>
        <details className="relative lg:hidden">
          <summary
            className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200"
            aria-label="Menüyü aç"
          >
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <nav
            aria-label="Mobil menü"
            className="absolute right-0 top-13 z-20 grid w-64 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
          >
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
            <hr className="my-1 border-slate-200" />
            {!loading &&
              (user ? (
                <>
                  {profileAccess?.userId === user.id &&
                    profileAccess.role === "student" && (
                      <Link
                        href="/fikirlerim"
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-800"
                      >
                        Fikirlerim
                      </Link>
                    )}
                  <Link
                    href="/profil"
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-800"
                  >
                    Profilim
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="rounded-lg bg-blue-700 px-3 py-2 text-left text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/giris"
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-800"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Kayıt Ol
                  </Link>
                </>
              ))}
          </nav>
        </details>
      </PageContainer>
    </header>
  );
}
