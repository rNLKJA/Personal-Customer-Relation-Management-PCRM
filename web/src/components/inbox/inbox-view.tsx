"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Inbox, KeyRound, Mail, MailOpen, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { markEmailReadAction } from "@/server/actions/profile";
import { useInbox, type InboxMessage } from "@/hooks/use-inbox";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  verification: KeyRound,
  "password-reset": KeyRound,
  "change-password": KeyRound,
  "fast-register": UserPlus,
} as const;

/**
 * The demo inbox: every e-mail the original app sent through Gmail (codes,
 * invitations) is stored in `email_outbox` and shown here, refreshed live.
 */
export function InboxView() {
  const { messages, isLoading, error, mutate } = useInbox(4000);
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const open = messages.find((m) => m.id === openId) ?? null;

  function select(m: InboxMessage) {
    setOpenId(m.id);
    if (!m.read) {
      markEmailReadAction(m.id).then(() => mutate());
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="text-destructive text-sm">Couldn&apos;t load the demo inbox. It will retry automatically.</p>;
  }
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No e-mails yet"
        description="Verification codes, password resets and invitations you trigger appear here within a second."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <ul className={cn("bg-card divide-y overflow-hidden rounded-2xl border shadow-(--shadow-soft)", open && "hidden lg:block")} aria-label="Messages">
        {messages.map((m) => {
          const Icon = KIND_ICON[m.kind] ?? Mail;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => select(m)}
                aria-current={openId === m.id ? "true" : undefined}
                className={cn(
                  "hover:bg-muted/60 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  openId === m.id && "bg-accent/60",
                )}
              >
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", m.read ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary")}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-sm", !m.read && "font-semibold")}>{m.subject}</span>
                    {!m.read && <span className="bg-primary size-2 shrink-0 rounded-full" aria-label="unread" />}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    to {m.to} · {formatRelative(m.createdAt)}
                  </span>
                </span>
                {m.code && <span className="text-muted-foreground font-mono text-xs tracking-wider">{m.code}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <section className={cn("bg-card min-h-96 overflow-hidden rounded-2xl border shadow-(--shadow-soft)", !open && "hidden lg:flex lg:items-center lg:justify-center")}>
        {open ? (
          <div className="flex h-full flex-col">
            <div className="border-b p-4 sm:p-5">
              <button type="button" onClick={() => setOpenId(null)} className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm lg:hidden">
                <ArrowLeft className="size-4" aria-hidden="true" /> All messages
              </button>
              <h2 className="text-lg font-semibold tracking-tight">{open.subject}</h2>
              <p className="text-muted-foreground text-xs">
                From 4399 CRM · to {open.to} · {formatDateTime(open.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {open.code && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(open.code!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    <span className="font-mono tracking-widest">{open.code}</span>
                  </Button>
                )}
                {open.actionPath && (
                  <Button size="sm" asChild>
                    <Link href={open.actionPath}>
                      <ExternalLink aria-hidden="true" /> Open invitation link
                    </Link>
                  </Button>
                )}
              </div>
              {open.actionPath && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Completing the invitation signs this browser in as the new account.
                </p>
              )}
            </div>
            <iframe
              title={`E-mail: ${open.subject}`}
              srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body>${open.html}</body></html>`}
              sandbox=""
              className="min-h-[420px] w-full flex-1 bg-[#383A59]"
            />
          </div>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <MailOpen className="size-4" aria-hidden="true" /> Select a message to read it.
          </p>
        )}
      </section>
    </div>
  );
}
