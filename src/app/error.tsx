"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">Bir şeyler ters gitti</h1>
      <p className="mt-4 text-slate-600">
        Sayfa yüklenirken beklenmeyen bir sorun oluştu. Lütfen yeniden deneyin.
      </p>
      <Button className="mt-7" onClick={reset}>
        Yeniden dene
      </Button>
    </div>
  );
}
