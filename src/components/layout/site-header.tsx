"use client";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LogIn, Menu, MessageCircle,UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mainNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getUserAccessProfile } from "@/services/user-service";
import { subscribeToChats } from "@/services/chat-service";
import type { UserRole } from "@/constants/roles";
import { PageContainer } from "./page-container";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [profileAccess, setProfileAccess] = useState<{
    userId: string;
    role: UserRole | null;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    void getUserAccessProfile(user.id).then((result) => {
      if (!active) return;
      setProfileAccess({
        userId: user.id,
        role: result.success ? (result.data?.role ?? null) : null,
      });
      if (result.success && result.data) {
        unsubscribe = subscribeToChats(user.id, result.data.role, (chats) => {
          if (!active || !chats.success) return;
          setMessageUnreadCount(
            chats.data.reduce(
              (total, conversation) =>
                total + (conversation.unreadCounts[user.id] ?? 0),
              0,
            ),
          );
        });
      }
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [loading, user]);

  async function handleLogout() {
    if (loggingOut) return;
    closeMobileMenu();
    setLoggingOut(true);
    const result = await logout();
    if (result.success) router.push("/");
    setLoggingOut(false);
  }

  function closeMobileMenu() {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <PageContainer className="flex min-h-18 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-blue-700"
        >
          
          <Image
  src="/hedef-kapisi-logo.jpeg"
  alt="Hedef Kapısı"
  width={40}
  height={40}
  priority
  unoptimized
  className="h-10 w-10 shrink-0 rounded-full object-cover"
/>
          <span className="truncate text-base font-extrabold tracking-tight text-blue-900 sm:text-lg">
            {siteConfig.name}
          </span>
        </Link>
        <nav
          aria-label="Ana menü"
          className="ml-3 hidden items-center gap-1 2xl:flex 2xl:ml-6"
        >
          {mainNavigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {!loading && user && (
          <div className="ml-auto shrink-0">
            <NotificationBell userId={user.id} />
          </div>
        )}
        <div className={`${user ? "" : "ml-auto"} shrink-0`}>
          <ThemeToggle compact />
        </div>
        <div className="hidden items-center gap-2 2xl:flex">
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
                {profileAccess?.userId === user.id &&
                  profileAccess.role === "mentor" && (
                    <Link
                      href="/mentorluk"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                    >
                      Mentor Paneli
                    </Link>
                  )}
                {profileAccess?.userId === user.id &&
                  profileAccess.role === "sponsor" && (
                    <Link
                      href="/sponsor/dashboard"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                    >
                      Sponsor Paneli
                    </Link>
                  )}
                <Link
                  href="/mesajlar"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  Mesajlar
                  {messageUnreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                      {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/takvim"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  <CalendarDays aria-hidden="true" className="size-4" />
                  Takvim
                </Link>
                <Link
                  href="/profil"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  Profilim
                </Link>
                <Link
                  href="/favorilerim"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  Favorilerim
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="min-h-10 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md focus-visible:outline-blue-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/giris"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-blue-700"
                >
                  <LogIn aria-hidden="true" className="size-4" />
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md focus-visible:outline-blue-700"
                >
                  <UserPlus aria-hidden="true" className="size-4" />
                  Kayıt Ol
                </Link>
              </>
            ))}
        </div>
        <details
          ref={mobileMenuRef}
          className="group shrink-0 2xl:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeMobileMenu();
          }}
        >
          <summary
            className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
            aria-label="Menüyü aç veya kapat"
            aria-haspopup="menu"
          >
            <Menu aria-hidden="true" className="size-5 group-open:hidden" />
            <X aria-hidden="true" className="hidden size-5 group-open:block" />
          </summary>
          <button
            type="button"
            aria-label="Mobil menüyü kapat"
            onClick={closeMobileMenu}
            className="fixed inset-0 top-18 z-40 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
          />
          <nav
            aria-label="Mobil menü"
            className="fixed inset-x-4 top-20 z-50 grid max-h-[calc(100dvh-6rem)] gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:left-auto sm:w-80"
          >
            <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Menü
            </p>
            {mainNavigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? "bg-blue-50 text-blue-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <hr className="my-1 border-slate-200" />
            {!loading &&
              (user ? (
                <>
                  {profileAccess?.userId === user.id &&
                    profileAccess.role === "student" && (
                      <Link
                        href="/fikirlerim"
                        onClick={closeMobileMenu}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                      >
                        Fikirlerim
                      </Link>
                    )}
                  {profileAccess?.userId === user.id &&
                    profileAccess.role === "mentor" && (
                      <Link
                        href="/mentorluk"
                        onClick={closeMobileMenu}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                      >
                        Mentor Paneli
                      </Link>
                    )}
                  {profileAccess?.userId === user.id &&
                    profileAccess.role === "sponsor" && (
                      <Link
                        href="/sponsor/dashboard"
                        onClick={closeMobileMenu}
                        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                      >
                        Sponsor Paneli
                      </Link>
                    )}
                  <Link
                    href="/mesajlar"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    <MessageCircle aria-hidden="true" className="size-4" />
                    Mesajlar
                  </Link>
                  <Link
                    href="/takvim"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    <CalendarDays aria-hidden="true" className="size-4" />
                    Takvim
                  </Link>
                  <Link
                    href="/profil"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    Profilim
                  </Link>
                  <Link
                    href="/favorilerim"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    Favorilerim
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="min-h-11 rounded-lg bg-blue-700 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/giris"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    href="/kayit"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
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
