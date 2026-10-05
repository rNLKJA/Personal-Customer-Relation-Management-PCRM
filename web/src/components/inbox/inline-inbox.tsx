"use client";

import { Inbox, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInbox, type InboxMessage } from "@/hooks/use-inbox";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Compact live view of the demo inbox for pre-login flows (sign up, reset):
 * the verification code "arrives" here a moment after it is requested.
 */
export function InlineInbox({
  kind,
  since,
  onUseCode,
  className,
}: {
  kind: InboxMessage["kind"];
  since: number | null;
  onUseCode?: (code: string) => void;
  className?: string;
}) {
  const { messages } = useInbox(since ? 2500 : 0);
  const latest = since
    ? messages.find((m) => m.kind === kind && new Date(m.createdAt).getTime() >= since - 2000)
    : undefined;

  return (
    <section
      aria-label="Demo inbox"
      aria-live="polite"
      className={cn("bg-card overflow-hidden rounded-xl border shadow-(--shadow-soft)", className)}
    >
      <div className="bg-muted/50 flex items-center gap-2 border-b px-3.5 py-2 text-xs font-medium">
        <Inbox className="text-primary size-3.5" aria-hidden="true" /> Demo inbox
        <span className="text-muted-foreground ml-auto font-normal">replaces Gmail SMTP</span>
      </div>
      {latest ? (
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
            <Mail className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{latest.subject}</p>
            <p className="text-muted-foreground truncate text-xs">
              to {latest.to} · {formatRelative(latest.createdAt)}
            </p>
          </div>
          {latest.code && (
            <div className="text-right">
              <p className="font-mono text-lg font-semibold tracking-[0.2em] tabular">{latest.code}</p>
              {onUseCode && (
                <Button type="button" size="xs" variant="link" className="h-auto p-0" onClick={() => onUseCode(latest.code!)}>
                  Use this code
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground px-3.5 py-3 text-sm">
          {since ? "Waiting for the e-mail…" : "Codes you request will appear here instantly."}
        </p>
      )}
    </section>
  );
}
