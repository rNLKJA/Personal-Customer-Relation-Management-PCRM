import { cn } from "@/lib/utils";

/**
 * Brand mark: two overlapping "people" circles inside a rounded tile. The
 * gradient is CSS (not an SVG <linearGradient> with an id), so several logos
 * on one page - including hidden ones - never clash.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[28%] bg-[linear-gradient(135deg,oklch(0.62_0.2_285),oklch(0.48_0.22_268))]",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-full">
        <circle cx="12.5" cy="14" r="5.5" fill="white" fillOpacity="0.92" />
        <circle cx="19.5" cy="18" r="5.5" fill="white" fillOpacity="0.55" />
        <circle cx="19.5" cy="18" r="1.6" fill="oklch(0.48 0.22 268)" />
      </svg>
    </span>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      {withText && (
        <span className="text-[15px] font-semibold tracking-tight">
          4399 <span className="font-medium text-muted-foreground">CRM</span>
        </span>
      )}
    </span>
  );
}
