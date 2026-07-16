import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-700",
        variant === "secondary" &&
          "border border-blue-200 bg-white text-blue-800 hover:bg-blue-50 focus-visible:outline-blue-700",
        variant === "ghost" &&
          "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-700",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
