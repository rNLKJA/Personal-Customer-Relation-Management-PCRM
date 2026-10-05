import { cn } from "@/lib/utils";

/** Brand mark: two overlapping "people" circles inside a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id="pcrm-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.62 0.2 285)" />
          <stop offset="1" stopColor="oklch(0.48 0.22 268)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#pcrm-mark)" />
      <circle cx="12.5" cy="14" r="5.5" fill="white" fillOpacity="0.92" />
      <circle cx="19.5" cy="18" r="5.5" fill="white" fillOpacity="0.55" />
      <circle cx="19.5" cy="18" r="1.6" fill="oklch(0.48 0.22 268)" />
    </svg>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      {withText && (
        <span className="text-[15px] font-semibold tracking-tight">
          4399 <span className="text-muted-foreground font-medium">CRM</span>
        </span>
      )}
    </span>
  );
}
