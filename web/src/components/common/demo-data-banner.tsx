import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoDataBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-[13px] leading-snug",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p>
        <strong className="font-semibold">Demo site - don&apos;t enter real personal data.</strong>{" "}
        <span className="text-muted-foreground">
          E-mails are never sent; they land in the on-screen demo inbox instead.
        </span>
      </p>
    </div>
  );
}
