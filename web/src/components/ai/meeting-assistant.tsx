"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiSettingsDialog } from "./ai-settings-dialog";
import { AiBadge } from "./ai-badge";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { runMeetingAssist } from "@/lib/ai/client";
import type { AiError } from "@/lib/ai/errors";
import {
  MEETING_ASSIST_FEATURE,
  MEETING_ASSIST_PROMPT_VERSION,
  MEETING_ASSIST_SYSTEM,
  meetingAssistUserMessage,
  type MeetingAssistOutput,
} from "@/lib/ai/meeting-assist";
import { ANTHROPIC_MODELS, PROVIDER_LABELS } from "@/lib/ai/models";
import { activeModel } from "@/lib/ai/settings";
import {
  REDACTION_LABELS,
  redact,
  tokenizeRedacted,
  type RedactionCategory,
} from "@/lib/redact/redact";
import { decideAiCallAction, logAiCallAction } from "@/server/actions/ai";
import { cn } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "preview" }
  | { kind: "sending" }
  | {
      kind: "draft";
      auditId: string;
      output: MeetingAssistOutput;
      meta: { model: string; latencyMs: number; tokens: number | null };
    }
  | {
      kind: "editing";
      auditId: string;
      summary: string;
      followUps: { action: string; due: string }[];
    }
  | { kind: "error"; error: AiError; logged: boolean };

const CATEGORY_ORDER: RedactionCategory[] = ["email", "phone", "address", "name"];

/**
 * Bring-your-own-key meeting-note assistant (human in the loop):
 *   1. redact the note in the browser and show exactly what will be sent;
 *   2. call the provider directly from the browser with the visitor's key;
 *   3. log the call (without the key) and show the answer as an AI-generated draft;
 *   4. the person accepts, edits or rejects it - only then is anything saved.
 */
export function MeetingAssistant({
  recordId,
  notes,
  meetingDay,
  knownNames,
  hasAcceptedSummary,
}: {
  recordId: string;
  notes: string;
  meetingDay: string;
  knownNames: string[];
  hasAcceptedSummary: boolean;
}) {
  const router = useRouter();
  const { settings, hasKey } = useAiSettings();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [deciding, startDeciding] = useTransition();
  const abort = useRef<AbortController | null>(null);

  const redaction = useMemo(() => redact(notes, { knownNames }), [notes, knownNames]);
  const userMessage = meetingAssistUserMessage(meetingDay, redaction.text);
  const model = activeModel(settings);
  const modelLabel =
    settings.provider === "anthropic"
      ? (ANTHROPIC_MODELS.find((m) => m.id === model)?.label ?? model)
      : model;

  async function send() {
    setPhase({ kind: "sending" });
    abort.current = new AbortController();
    const result = await runMeetingAssist({
      settings,
      feature: MEETING_ASSIST_FEATURE,
      userMessage,
      redactionCounts: redaction.counts,
      recordId,
      signal: abort.current.signal,
    });
    if (!result.ok && result.error.kind === "no_key") {
      setPhase({ kind: "error", error: result.error, logged: false });
      return;
    }
    // Every call that reached (or tried to reach) the provider is logged - without the key.
    const logged = await logAiCallAction(result.audit);
    if (!result.ok) {
      setPhase({ kind: "error", error: result.error, logged: logged.ok });
      return;
    }
    if (!logged.ok) {
      toast.error(
        `The answer could not be recorded in your AI log, so it is not shown. ${logged.error}`,
      );
      setPhase({ kind: "preview" });
      return;
    }
    setPhase({
      kind: "draft",
      auditId: logged.id,
      output: result.output,
      meta: {
        model: result.audit.servedModel ?? model,
        latencyMs: result.audit.latencyMs,
        tokens:
          result.audit.inputTokens != null && result.audit.outputTokens != null
            ? result.audit.inputTokens + result.audit.outputTokens
            : null,
      },
    });
  }

  function decide(
    auditId: string,
    decision: "accepted" | "edited" | "rejected",
    output: MeetingAssistOutput | null,
  ) {
    startDeciding(async () => {
      const res = await decideAiCallAction({
        id: auditId,
        decision,
        finalOutput: output ? JSON.stringify(output) : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (decision === "rejected") {
        toast.success("Draft discarded. The call stays in your AI log.");
      } else {
        toast.success(
          decision === "edited"
            ? "Your edited summary was saved to this meeting."
            : "Summary saved to this meeting, labelled as AI-generated.",
        );
      }
      setPhase({ kind: "idle" });
      router.refresh();
    });
  }

  if (!notes.trim()) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          Add notes to this meeting to get an AI summary and suggested follow-ups.
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      action={
        phase.kind === "idle" ? (
          <Button size="sm" variant="outline" onClick={() => setPhase({ kind: "preview" })}>
            <Sparkles /> {hasAcceptedSummary ? "Summarise again" : "Summarise note"}
          </Button>
        ) : null
      }
    >
      {phase.kind === "idle" && (
        <p className="text-sm text-muted-foreground">
          Optional: summarise this note and suggest follow-ups with your own AI key. Personal
          details are removed in your browser first and you review exactly what is sent.
        </p>
      )}

      {(phase.kind === "preview" || phase.kind === "sending") && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">
              What will be sent to {PROVIDER_LABELS[settings.provider]}{" "}
              <span className="font-normal text-muted-foreground">({modelLabel})</span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Removed before sending">
              {CATEGORY_ORDER.map((c) => (
                <li
                  key={c}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                    redaction.counts[c]
                      ? "border-success/30 bg-success/10 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <EyeOff className="size-3" aria-hidden="true" />
                  {REDACTION_LABELS[c]}: {redaction.counts[c]}
                </li>
              ))}
            </ul>
          </div>
          <pre
            className="max-h-64 overflow-auto rounded-xl border bg-surface p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap"
            aria-label="Exact message that will be sent"
            tabIndex={0}
          >
            {tokenizeRedacted(userMessage).map((part, i) =>
              part.category ? (
                <mark key={i} className="rounded bg-success/15 px-0.5 font-semibold text-success">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </pre>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Fixed instructions sent with it ({MEETING_ASSIST_PROMPT_VERSION})
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg border bg-surface p-3 font-mono text-[11.5px] whitespace-pre-wrap">
              {MEETING_ASSIST_SYSTEM}
            </pre>
          </details>
          <p className="text-xs text-muted-foreground">
            Not detected automatically: names of other people and details written out in words. Edit
            the note first if it contains anything else you would not share.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasKey ? (
              <Button onClick={send} disabled={phase.kind === "sending"}>
                {phase.kind === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
                {phase.kind === "sending" ? "Waiting for the model…" : `Send to ${modelLabel}`}
              </Button>
            ) : (
              <AiSettingsDialog
                trigger={
                  <Button>
                    <Sparkles /> Add your API key to continue
                  </Button>
                }
              />
            )}
            {phase.kind === "sending" ? (
              <Button variant="ghost" onClick={() => abort.current?.abort()}>
                Cancel request
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
                Cancel
              </Button>
            )}
            {hasKey && <AiSettingsDialog />}
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="space-y-3">
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
          >
            <p className="font-medium text-destructive">{phase.error.userMessage}</p>
            {phase.logged && (
              <p className="mt-1 text-xs text-muted-foreground">
                The failed call is recorded in your{" "}
                <Link href="/ai-log" className="underline">
                  AI log
                </Link>
                .
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPhase({ kind: "preview" })}>
              Back
            </Button>
            <AiSettingsDialog />
          </div>
        </div>
      )}

      {phase.kind === "draft" && (
        <div className="space-y-4">
          <DraftView output={phase.output} />
          <p className="text-xs text-muted-foreground">
            {phase.meta.model} · {(phase.meta.latencyMs / 1000).toFixed(1)}s
            {phase.meta.tokens != null
              ? ` · ${phase.meta.tokens.toLocaleString("en-AU")} tokens`
              : ""}{" "}
            · nothing is saved until you decide
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={deciding}
              onClick={() => decide(phase.auditId, "accepted", phase.output)}
            >
              {deciding ? <Loader2 className="animate-spin" /> : <Check />} Accept
            </Button>
            <Button
              variant="outline"
              disabled={deciding}
              onClick={() =>
                setPhase({
                  kind: "editing",
                  auditId: phase.auditId,
                  summary: phase.output.summary,
                  followUps: phase.output.follow_ups.map((f) => ({
                    action: f.action,
                    due: f.due ?? "",
                  })),
                })
              }
            >
              <Pencil /> Edit
            </Button>
            <Button
              variant="ghost"
              disabled={deciding}
              onClick={() => decide(phase.auditId, "rejected", null)}
            >
              <X /> Reject
            </Button>
          </div>
        </div>
      )}

      {phase.kind === "editing" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const output: MeetingAssistOutput = {
              summary: phase.summary.trim(),
              follow_ups: phase.followUps
                .filter((f) => f.action.trim())
                .map((f) => ({ action: f.action.trim(), due: f.due.trim() || null })),
            };
            if (!output.summary) {
              toast.error("The summary cannot be empty.");
              return;
            }
            decide(phase.auditId, "edited", output);
          }}
        >
          <AiBadge decision="editing" />
          <div className="space-y-1.5">
            <label htmlFor="ai-summary" className="text-sm font-medium">
              Summary
            </label>
            <Textarea
              id="ai-summary"
              value={phase.summary}
              onChange={(e) => setPhase({ ...phase, summary: e.target.value })}
              rows={4}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Follow-ups</legend>
            {phase.followUps.map((f, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Follow-up ${i + 1}`}
                  value={f.action}
                  onChange={(e) => {
                    const next = [...phase.followUps];
                    next[i] = { ...f, action: e.target.value };
                    setPhase({ ...phase, followUps: next });
                  }}
                />
                <Input
                  aria-label={`Follow-up ${i + 1} timing`}
                  placeholder="when"
                  className="w-32 shrink-0"
                  value={f.due}
                  onChange={(e) => {
                    const next = [...phase.followUps];
                    next[i] = { ...f, due: e.target.value };
                    setPhase({ ...phase, followUps: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove follow-up ${i + 1}`}
                  onClick={() =>
                    setPhase({ ...phase, followUps: phase.followUps.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setPhase({ ...phase, followUps: [...phase.followUps, { action: "", due: "" }] })
              }
            >
              <Plus /> Add follow-up
            </Button>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={deciding}>
              {deciding ? <Loader2 className="animate-spin" /> : <Check />} Save edited version
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={deciding}
              onClick={() => decide(phase.auditId, "rejected", null)}
            >
              <X /> Reject instead
            </Button>
          </div>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section
      aria-labelledby="ai-assistant"
      className="rounded-2xl border border-dashed border-primary/30 bg-accent/25 p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-assistant" className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden="true" /> Meeting-note assistant
          <span className="rounded-full border bg-card px-1.5 text-[10px] font-medium text-muted-foreground uppercase">
            optional · your key
          </span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DraftView({ output }: { output: MeetingAssistOutput }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <AiBadge decision="draft" />
      <p className="mt-3 text-sm leading-relaxed">{output.summary}</p>
      {output.follow_ups.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {output.follow_ups.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              <span>
                {f.action}
                {f.due && <span className="text-muted-foreground"> · {f.due}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No follow-ups suggested.</p>
      )}
    </div>
  );
}
