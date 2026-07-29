import { ArrowLeft, Home, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-700">
        <SearchX aria-hidden="true" className="size-8" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-widest text-blue-700">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold">Sayfa bulunamadı</h1>
      <p className="mt-4 text-slate-600">
        Aradığınız sayfa taşınmış, silinmiş veya hiç oluşturulmamış olabilir.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
        >
          <Home aria-hidden="true" className="size-4" /> Ana sayfaya dön
        </Link>
        <Link
          href="/hayaller"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 font-semibold text-blue-800"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Hayalleri keşfet
        </Link>
      </div>
    </div>
  );
}
