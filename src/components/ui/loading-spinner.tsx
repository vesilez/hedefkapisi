import { cn } from "@/lib/utils/cn";

export function LoadingSpinner({
  className,
  label = "Yükleniyor",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-2xl animate-pulse p-5 sm:p-6",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-5 w-2/5 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="h-16 rounded-xl bg-slate-100" />
          <div className="h-16 rounded-xl bg-slate-100" />
          <div className="h-16 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
