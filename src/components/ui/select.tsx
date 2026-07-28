import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 focus-visible:border-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 sm:text-sm",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
