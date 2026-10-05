import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel = 2,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Use 3 when the empty state sits inside a section that already has an h2. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-3 rounded-full bg-accent blur-xl" aria-hidden="true" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border bg-card text-accent-foreground shadow-(--shadow-soft)">
          <Icon className="size-5" />
        </div>
      </div>
      <Heading className="text-base font-semibold tracking-tight">{title}</Heading>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
