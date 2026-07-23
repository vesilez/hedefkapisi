import Link from "next/link";
import { adminNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "./theme-toggle";

export function AdminSidebar() {
  return (
    <aside className="bg-slate-950 p-5 text-white md:min-h-screen md:w-72">
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
        className="mt-6 flex gap-2 overflow-x-auto md:grid"
      >
        {adminNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
