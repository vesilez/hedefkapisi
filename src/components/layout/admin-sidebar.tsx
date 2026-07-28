import Link from "next/link";
import { adminNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
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
      <nav
        aria-label="Yönetim menüsü"
        className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:px-0"
      >
        {adminNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
