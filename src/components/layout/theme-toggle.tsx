"use client";

import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "hedef-kapisi-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme =
      root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Tema yine de mevcut oturumda uygulanır.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      aria-label="Açık veya koyu temaya geç"
      title="Temayı değiştir"
    >
      <Sun className="theme-icon-light size-5" aria-hidden="true" />
      <Moon className="theme-icon-dark hidden size-5" aria-hidden="true" />
      {!compact && <span>Tema</span>}
    </button>
  );
}
