import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
