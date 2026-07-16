import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800",
        className,
      )}
      {...props}
    />
  );
}
