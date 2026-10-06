import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FlaskConical,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { AiSettingsDialog } from "@/components/ai/ai-settings-dialog";
import { aiLogStats, allAiCalls, listAiCalls } from "@/server/ai-audit";
import { requireUser } from "@/server/session";
import { isSharedDemo } from "@/server/users";
import { PROVIDER_LABELS } from "@/lib/ai/models";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AiAuditEntry } from "@/db/schema";

export const metadata: Metadata = { title: "AI log" };

const PAGE_SIZE = 15;

const DECISION_STYLE: Record<AiAuditEntry["decision"], string> = {
  pending: "border-warning/40 bg-warning/10",
  accepted: "border-success/40 bg-success/10",
  edited: "border-primary/30 bg-accent",
  rejected: "border-destructive/30 bg-destructive/10",
  not_applicable: "bg-muted",
};
const DECISION_LABEL: Record<AiAuditEntry["decision"], string> = {
  pending: "Awaiting decision",
  accepted: "Accepted",
  edited: "Edited, then kept",
  rejected: "Rejected",
  not_applicable: "No decision needed",
};
const REDACTION_NOUNS: Record<string, string> = {
  email: "e-mail",
  phone: "phone number",
  address: "address",
  name: "name",
};
const FEATURE_LABEL: Record<string, string> = {
  "meeting-note-assistant": "Meeting-note assistant",
  "follow-up-eval": "Evaluation run",
};

function pretty(json: string | null): string {
  if (!json) return "";
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export default async function AiLogPage({ searchParams }: PageProps<"/ai-log">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [data, all] = await Promise.all([
    listAiCalls(user.id, { page: Math.max(1, Number(sp.page) || 1), pageSize: PAGE_SIZE }),
    allAiCalls(user.id),
  ]);
  const stats = aiLogStats(all);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="AI log"
        description="Every AI call made with your own key: exactly what was sent (after redaction), what came back, the model, timing, token usage and your decision. Your API key is never sent here, so it is never logged."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/your-data/export/ai-log.json" download>
                <Download /> JSON
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/your-data/export/ai-log.csv" download>
                <Download /> CSV
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AiSettingsDialog />
        <Button asChild variant="outline" size="sm">
          <Link href="/ai-log/evaluate">
            <FlaskConical /> Evaluation harness
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/methods#ai-use">
            <ScrollText /> AI use statement
          </Link>
        </Button>
      </div>

      {isSharedDemo(user) && (
        <p className="mb-4 rounded-xl border bg-accent/50 px-4 py-2.5 text-sm text-accent-foreground">
          Shared demo account: other visitors can see these entries. Use a guest sandbox to keep
          your AI calls private.
        </p>
      )}

      {all.length > 0 && (
        <section aria-label="Summary" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Calls" value={stats.calls} note={`${stats.failed} failed`} />
          <Stat
            label="Kept (accepted or edited)"
            value={stats.decided.accepted + stats.decided.edited}
            note={`${stats.decided.edited} edited first`}
          />
          <Stat
            label="Rejected"
            value={stats.decided.rejected}
            note={`${stats.decided.pending} awaiting`}
          />
          <Stat
            label="Median latency"
            value={
              stats.medianLatencyMs == null
                ? "-"
                : stats.medianLatencyMs < 1000
                  ? `${Math.round(stats.medianLatencyMs)} ms`
                  : `${(stats.medianLatencyMs / 1000).toFixed(1)} s`
            }
            note="successful calls"
          />
        </section>
      )}

      {data.total === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI calls yet"
          description="Open a meeting with notes and use the meeting-note assistant, or run the evaluation harness. Each call appears here."
          action={
            <Button asChild>
              <Link href="/records">Go to meetings</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border bg-card shadow-(--shadow-soft)">
          <ol className="divide-y">
            {data.items.map((e) => (
              <li key={e.id} className="px-4 py-3.5">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">
                      {FEATURE_LABEL[e.feature] ?? e.feature}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        e.error
                          ? "border-destructive/30 bg-destructive/10"
                          : DECISION_STYLE[e.decision],
                      )}
                    >
                      {e.error ? "Failed" : DECISION_LABEL[e.decision]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {PROVIDER_LABELS[e.provider]} ·{" "}
                      <code className="font-mono">{e.servedModel ?? e.model}</code>
                    </span>
                    <time
                      dateTime={e.createdAt.toISOString()}
                      title={formatDateTime(e.createdAt)}
                      className="ml-auto text-xs text-muted-foreground"
                    >
                      {formatRelative(e.createdAt)}
                    </time>
                  </summary>
                  <div className="mt-3 space-y-3 pl-7 text-sm">
                    <dl className="tabular grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                      <Meta label="Latency" value={`${e.latencyMs.toLocaleString("en-AU")} ms`} />
                      <Meta
                        label="Tokens in / out"
                        value={
                          e.inputTokens == null
                            ? "-"
                            : `${e.inputTokens} / ${e.outputTokens ?? "-"}`
                        }
                      />
                      <Meta
                        label="Removed before sending"
                        value={
                          Object.entries(e.redactionCounts)
                            .filter(([, n]) => n > 0)
                            .map(([k, n]) => `${n} ${REDACTION_NOUNS[k] ?? k}${n === 1 ? "" : "s"}`)
                            .join(", ") || "nothing"
                        }
                      />
                      <Meta label="Prompt" value={e.promptVersion} />
                    </dl>
                    {e.recordId && (
                      <p className="text-xs">
                        <Link
                          href={`/records/${e.recordId}`}
                          className="text-primary hover:underline"
                        >
                          Open the meeting
                        </Link>
                      </p>
                    )}
                    <Block
                      title="Sent to the provider (exact text, after redaction)"
                      body={e.input}
                    />
                    {e.error && <Block title="Error" body={e.error} tone="error" />}
                    {e.output && (
                      <Block title="AI-generated answer (as returned)" body={pretty(e.output)} />
                    )}
                    {e.finalOutput && e.decision === "edited" && (
                      <Block title="Kept after your edits" body={pretty(e.finalOutput)} />
                    )}
                    {e.decidedAt && (
                      <p className="text-xs text-muted-foreground">
                        Decision recorded {formatDateTime(e.decidedAt)}.
                      </p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span className="tabular">
              {data.total} {data.total === 1 ? "call" : "calls"} · page {data.page} of {data.pages}
            </span>
            <div className="flex gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Newer calls"
                aria-disabled={data.page <= 1}
                className={cn(data.page <= 1 && "pointer-events-none opacity-40")}
              >
                <Link href={`/ai-log?page=${data.page - 1}`}>
                  <ChevronLeft />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Older calls"
                aria-disabled={data.page >= data.pages}
                className={cn(data.page >= data.pages && "pointer-events-none opacity-40")}
              >
                <Link href={`/ai-log?page=${data.page + 1}`}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-soft)">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Block({ title, body, tone }: { title: string; body: string; tone?: "error" }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
      <pre
        className={cn(
          "max-h-56 overflow-auto rounded-lg border p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap",
          tone === "error" ? "border-destructive/30 bg-destructive/5" : "bg-surface",
        )}
      >
        {body}
      </pre>
    </div>
  );
}
