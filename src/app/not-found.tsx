import Link from "next/link";
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
        404
      </p>
      <h1 className="mt-3 text-3xl font-extrabold">Sayfa bulunamadı</h1>
      <p className="mt-4 text-slate-600">
        Aradığınız sayfa taşınmış, silinmiş veya hiç oluşturulmamış olabilir.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
