import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function LoadingSpinner({
  className,
  label = "Yükleniyor",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm text-slate-600",
        className,
      )}
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      <span>{label}</span>
    </span>
  );
}
