"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center" role="alert">
      <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-800">
        <AlertTriangle aria-hidden="true" className="size-8" />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold">Bir şeyler ters gitti</h1>
      <p className="mt-4 text-slate-600">
        İşleminiz tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin;
        sorun sürerse geri bildirim sayfasından bize ulaşın.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={reset}>Yeniden dene</Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50"
        >
          <Home aria-hidden="true" className="size-4" /> Ana sayfa
        </Link>
      </div>
    </div>
  );
}
