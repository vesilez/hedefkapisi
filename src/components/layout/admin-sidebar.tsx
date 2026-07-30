import Link from "next/link";
import { adminNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function AdminSidebar() {
  return (
    <aside className="bg-slate-950 p-4 text-white sm:p-5 md:sticky md:top-0 md:min-h-screen md:w-72 md:self-start">
      <Link href="/" className="text-lg font-extrabold">
        {siteConfig.name}
      </Link>
      <p className="mt-1 text-xs font-medium uppercase tracking-widest text-blue-300">
        Yönetim
      </p>
      <div className="mt-4">
        <ThemeToggle />
      </div>
      <details className="group mt-5 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-white">
          Yönetim menüsü
          <Menu aria-hidden="true" className="size-5" />
        </summary>
        <nav
          aria-label="Yönetim menüsü"
          className="mt-2 hidden gap-1 rounded-xl border border-slate-800 bg-slate-900 p-2 group-open:grid"
        >
          {adminNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
      <nav aria-label="Yönetim menüsü" className="mt-5 hidden gap-1 md:grid">
        {adminNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
