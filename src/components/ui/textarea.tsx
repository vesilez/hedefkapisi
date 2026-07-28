import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 sm:text-sm",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
