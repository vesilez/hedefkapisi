import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mx-auto mb-4 size-8 text-blue-700" />
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
