import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT = {
  draft: "AI-generated draft · not saved",
  editing: "AI-generated · you are editing it",
  accepted: "AI-generated · accepted by you",
  edited: "AI-generated · edited by you",
} as const;

/** The visible "AI-generated" label every AI output carries. */
export function AiBadge({
  decision,
  className,
}: {
  decision: keyof typeof TEXT;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/25 bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden="true" />
      {TEXT[decision]}
    </span>
  );
}
