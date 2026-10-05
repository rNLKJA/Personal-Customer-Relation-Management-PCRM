"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FlaskConical, Loader2, Play, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiSettingsDialog } from "./ai-settings-dialog";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { runMeetingAssist } from "@/lib/ai/client";
import type { AiErrorKind } from "@/lib/ai/errors";
import { FOLLOW_UP_EVAL_FEATURE, meetingAssistUserMessage } from "@/lib/ai/meeting-assist";
import { ANTHROPIC_MODELS, PROVIDER_LABELS } from "@/lib/ai/models";
import { activeModel } from "@/lib/ai/settings";
import { FOLLOW_UP_CORPUS, type Split } from "@/lib/eval/followup-corpus";
import {
  EVAL_RESAMPLES,
  EVAL_SEED,
  compare,
  extractFollowUpsBaseline,
  scoreNote,
  summarise,
  type FollowUp,
  type MethodSummary,
  type NoteScore,
  type PairedComparison,
} from "@/lib/eval/followups";
import { redact } from "@/lib/redact/redact";
import type { BootstrapResult, Interval } from "@/lib/stats";
import { toCsv } from "@/lib/csv";
import { logAiCallAction } from "@/server/actions/ai";
import { cn } from "@/lib/utils";

/**
 * Evaluation harness: the same notes through the rule-based baseline and the
 * LLM (the meeting-note assistant's exact prompt), scored by the same keyword
 * matcher, compared note by note. Runs in the browser with the visitor's key;
 * every LLM call is written to the AI log (decision "not applicable"), and a
 * result whose call could not be logged is not counted.
 *
 * Fairness rules:
 * - The baseline is summarised on exactly the notes the LLM was scored on
 *   (the full-split baseline is shown separately as a reference).
 * - Failures the model is responsible for (an answer that is not valid JSON
 *   for the schema, a refusal, a cut-off answer) are scored as empty
 *   predictions: the person got nothing for that note.
 * - Only infrastructure failures (network, rate limit, overload, provider
 *   errors, key problems) are excluded, and their number is reported.
 */

/** The model's fault: scored as an empty answer, not dropped. */
const MODEL_FAILURES: readonly AiErrorKind[] = ["bad_output", "refusal", "truncated"];
/** Stop the run: every further call would fail the same way. */
const FATAL: readonly AiErrorKind[] = ["invalid_key", "billing", "permission", "model_not_found"];

type Status = "ok" | "model-failure" | "excluded";

const STATUS_LABEL: Record<Status | "not-run", string> = {
  ok: "ok",
  "model-failure": "model failure (scored as empty)",
  excluded: "infrastructure failure (excluded)",
  "not-run": "not run",
};

interface LlmResult {
  noteId: number;
  status: Status;
  predictions: FollowUp[];
  error: string | null;
  errorKind: AiErrorKind | null;
  latencyMs: number;
  tokens: number | null;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
function ci(s: Interval | BootstrapResult | null): string {
  if (!s) return "-";
  if ("degenerate" in s && s.degenerate) return `${pct(s.estimate)} (no interval)`;
  return `${pct(s.estimate)} (${pct(s.lower)}-${pct(s.upper)})`;
}

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function EvalHarness() {
  const { settings, hasKey } = useAiSettings();
  const [split, setSplit] = useState<Split>("held-out");
  const [results, setResults] = useState<Record<Split, { model: string; rows: LlmResult[] }>>({
    "held-out": { model: "", rows: [] },
    development: { model: "", rows: [] },
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const stop = useRef<AbortController | null>(null);

  const notes = useMemo(() => FOLLOW_UP_CORPUS.filter((n) => n.split === split), [split]);
  const baselinePreds = useMemo(
    () => new Map(notes.map((n) => [n.id, extractFollowUpsBaseline(n.note)])),
    [notes],
  );
  const baseline = useMemo(
    () => notes.map((n) => scoreNote(n, baselinePreds.get(n.id)!)),
    [notes, baselinePreds],
  );
  const llm = results[split].rows;
  const runModel = results[split].model;
  const runModelId = runModel.split(":").slice(1).join(":");
  const scored = llm.filter((r) => r.status !== "excluded");
  const llmScores: NoteScore[] = scored.map((r) =>
    scoreNote(
      notes.find((n) => n.id === r.noteId)!,
      r.predictions,
    ),
  );
  const scoredIds = new Set(llmScores.map((s) => s.noteId));
  const baselineOnSame = baseline.filter((s) => scoredIds.has(s.noteId));
  const baseAll = summarise(baseline);
  const baseSame = llmScores.length ? summarise(baselineOnSame) : null;
  const llmSummary = llmScores.length ? summarise(llmScores) : null;
  const paired = llmScores.length
    ? {
        recall: compare(llmScores, baselineOnSame, "recall"),
        f1: compare(llmScores, baselineOnSame, "f1"),
      }
    : null;
  const counts = {
    notesInSplit: notes.length,
    scored: scored.length,
    modelFailuresScoredAsEmpty: llm.filter((r) => r.status === "model-failure").length,
    infrastructureFailuresExcluded: llm.filter((r) => r.status === "excluded").length,
    notRun: notes.length - llm.length,
  };
  const partial = llm.length > 0 && counts.scored < notes.length;
  const model = activeModel(settings);
  const modelLabel =
    settings.provider === "anthropic"
      ? (ANTHROPIC_MODELS.find((m) => m.id === model)?.label ?? model)
      : model;

  async function run() {
    setRunning(true);
    setProgress(0);
    stop.current = new AbortController();
    const out: LlmResult[] = [];
    const runLabel = `${settings.provider}:${model}`;
    for (const [i, note] of notes.entries()) {
      if (stop.current.signal.aborted) break;
      const red = redact(note.note);
      const res = await runMeetingAssist({
        settings,
        feature: FOLLOW_UP_EVAL_FEATURE,
        userMessage: meetingAssistUserMessage(note.meetingDay, red.text),
        redactionCounts: red.counts,
        recordId: null,
        signal: stop.current.signal,
      });
      if (!res.ok && res.error.kind === "no_key") break;
      // Every call that reached (or may have reached) the provider is logged,
      // including one cancelled in flight - it may still have been billed.
      const logged = await logAiCallAction(res.audit);
      if (!logged.ok) {
        toast.error(
          `This call could not be recorded in your AI log, so the run stopped and it is not counted. ${logged.error}`,
        );
        break;
      }
      if (!res.ok && res.error.kind === "aborted") break;
      const status: Status = res.ok
        ? "ok"
        : MODEL_FAILURES.includes(res.error.kind)
          ? "model-failure"
          : "excluded";
      out.push({
        noteId: note.id,
        status,
        predictions: res.ok ? res.output.follow_ups : [],
        error: res.ok ? null : res.error.userMessage,
        errorKind: res.ok ? null : res.error.kind,
        latencyMs: res.audit.latencyMs,
        tokens:
          res.audit.inputTokens != null && res.audit.outputTokens != null
            ? res.audit.inputTokens + res.audit.outputTokens
            : null,
      });
      setProgress(i + 1);
      setResults((r) => ({ ...r, [split]: { model: runLabel, rows: [...out] } }));
      if (!res.ok && FATAL.includes(res.error.kind)) {
        toast.error(res.error.userMessage);
        break;
      }
    }
    setRunning(false);
  }

  function rows() {
    return notes.map((n) => {
      const b = baseline.find((s) => s.noteId === n.id)!;
      const l = llm.find((r) => r.noteId === n.id);
      const ls = llmScores.find((s) => s.noteId === n.id);
      return {
        split,
        noteId: n.id,
        goldItems: n.gold.length,
        baselineSuggestions: b.predicted,
        baselineMatched: b.matchedGold,
        baselineRecall: b.recall,
        baselineF1: b.f1,
        llmModel: l ? runModel : null,
        llmStatus: STATUS_LABEL[l?.status ?? "not-run"],
        llmSuggestions: ls?.predicted ?? null,
        llmMatched: ls?.matchedGold ?? null,
        llmRecall: ls?.recall ?? null,
        llmF1: ls?.f1 ?? null,
        llmLatencyMs: l?.latencyMs ?? null,
        llmError: l?.error ?? null,
        baselineFollowUps: baselinePreds
          .get(n.id)!
          .map((f) => f.action)
          .join(" | "),
        llmFollowUps: l?.predictions.map((f) => f.action).join(" | ") ?? null,
      };
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Corpus split"
            className="inline-flex rounded-lg border p-0.5"
          >
            {(["held-out", "development"] as Split[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={split === s}
                disabled={running}
                onClick={() => setSplit(s)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  split === s
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "held-out" ? "Held-out (16 notes)" : "Development (16 notes)"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <AiSettingsDialog />
            {running ? (
              <Button variant="outline" onClick={() => stop.current?.abort()}>
                <Square /> Stop
              </Button>
            ) : (
              <Button onClick={run} disabled={!hasKey}>
                <Play /> Run with {modelLabel}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {hasKey
            ? `${notes.length} calls to ${PROVIDER_LABELS[settings.provider]}, one per note, each roughly 600 tokens. The notes are synthetic and already use [NAME] placeholders; they go through the same redaction step as real notes. Every call is written to your AI log.`
            : "The baseline needs no key. Add your own key in AI settings to run the LLM side of the comparison."}
        </p>
        {running && (
          <div className="mt-3 flex items-center gap-3 text-sm" role="status">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            {progress} of {notes.length} notes
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress / notes.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <section
        className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6"
        aria-labelledby="results"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="results"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <FlaskConical className="size-4 text-primary" aria-hidden="true" /> Results - {split}{" "}
            split
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                download(
                  `4399crm-followup-eval-${split}.json`,
                  "application/json",
                  JSON.stringify(
                    {
                      split,
                      seed: EVAL_SEED,
                      resamples: EVAL_RESAMPLES,
                      model: llm.length ? runModel : null,
                      run: { ...counts, partial },
                      scoring:
                        "Model failures (bad output, refusal, truncated) are scored as empty predictions; infrastructure failures are excluded and counted. The baseline is summarised on the same notes as the LLM.",
                      baselineSameNotes: baseSame,
                      baselineAllNotes: baseAll,
                      llm: llmSummary,
                      paired,
                      notes: rows(),
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download /> JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const r = rows();
                download(
                  `4399crm-followup-eval-${split}.csv`,
                  "text/csv",
                  toCsv(Object.keys(r[0]), r),
                );
              }}
            >
              <Download /> CSV
            </Button>
          </div>
        </div>

        {llm.length > 0 && (
          <p
            className={cn(
              "mt-3 rounded-lg px-3 py-2 text-xs",
              partial ? "bg-warning/10 text-foreground" : "bg-surface text-muted-foreground",
            )}
          >
            {partial ? <strong>Partial run: </strong> : null}
            {counts.scored} of {counts.notesInSplit} notes scored
            {counts.modelFailuresScoredAsEmpty
              ? ` (${counts.modelFailuresScoredAsEmpty} model failure${counts.modelFailuresScoredAsEmpty === 1 ? "" : "s"} scored as empty answers)`
              : ""}
            {counts.infrastructureFailuresExcluded
              ? ` · ${counts.infrastructureFailuresExcluded} infrastructure failure${counts.infrastructureFailuresExcluded === 1 ? "" : "s"} excluded`
              : ""}
            {counts.notRun ? ` · ${counts.notRun} not run` : ""}. The baseline row is computed on
            the same notes.
          </p>
        )}

        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Summary table">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Method
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Mean recall per note (95% CI)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Mean F1 per note (95% CI)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Pooled recall (Wilson)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Precision (Wilson)
                </th>
                <th scope="col" className="py-2 font-medium">
                  On no-action notes
                </th>
              </tr>
            </thead>
            <tbody className="tabular divide-y">
              {llmSummary && baseSame ? (
                <>
                  <SummaryRow
                    name={`Rule-based baseline · same ${counts.scored} notes`}
                    s={baseSame}
                  />
                  <SummaryRow
                    name={
                      <span className="inline-flex flex-col gap-0.5">
                        <span>LLM: {runModelId}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                          <Sparkles className="size-3" aria-hidden="true" /> AI-generated ·{" "}
                          {counts.scored} notes
                        </span>
                      </span>
                    }
                    s={llmSummary}
                  />
                  <SummaryRow
                    name={`Rule-based baseline · all ${notes.length} notes (reference)`}
                    s={baseAll}
                    muted
                  />
                </>
              ) : (
                <>
                  <SummaryRow
                    name={`Rule-based baseline · all ${notes.length} notes`}
                    s={baseAll}
                  />
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">LLM</td>
                    <td colSpan={5} className="py-2.5 text-muted-foreground">
                      Not run yet in this browser.
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {paired && (
          <div className="mt-4 space-y-2 rounded-xl bg-surface p-4 text-sm">
            <PairedLine label="mean per-note recall" c={paired.recall} />
            <PairedLine
              label="mean per-note F1 (penalises extra suggestions; every note counts)"
              c={paired.f1}
            />
            <p className="text-xs text-muted-foreground">
              Paired bootstrap, {EVAL_RESAMPLES.toLocaleString("en-AU")} resamples, seed {EVAL_SEED}
              ; exact two-sided sign test on wins and losses (ties dropped). Recall alone rewards
              listing more actions, so read it next to F1.
            </p>
          </div>
        )}

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Per-note results
          </summary>
          <ol className="mt-3 divide-y rounded-xl border">
            {notes.map((n) => {
              const b = baseline.find((s) => s.noteId === n.id)!;
              const l = llm.find((r) => r.noteId === n.id);
              const ls = llmScores.find((s) => s.noteId === n.id);
              return (
                <li key={n.id} className="space-y-1.5 p-3 text-xs">
                  <p className="text-sm">
                    <span className="font-mono text-muted-foreground">#{n.id}</span> {n.note}
                  </p>
                  <p className="text-muted-foreground">
                    Gold: {n.gold.length ? n.gold.map((g) => g.label).join("; ") : "none"}
                  </p>
                  <p>
                    <span className="font-medium">Baseline</span> {b.matchedGold}/{n.gold.length} ·{" "}
                    {baselinePreds
                      .get(n.id)!
                      .map((f) => f.action)
                      .join("; ") || "no suggestions"}
                  </p>
                  {l && (
                    <p>
                      {l.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Sparkles className="size-3 text-primary" aria-hidden="true" />
                          AI-generated ({runModelId})
                        </span>
                      ) : (
                        <span className="font-medium">LLM call ({runModelId})</span>
                      )}{" "}
                      {l.status === "ok"
                        ? `${ls?.matchedGold ?? 0}/${n.gold.length} · ${l.predictions.map((f) => f.action).join("; ") || "no suggestions"}`
                        : l.status === "model-failure"
                          ? `0/${n.gold.length} · ${l.error} (scored as an empty answer)`
                          : `not scored: ${l.error}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      </section>
    </div>
  );
}

function PairedLine({ label, c }: { label: string; c: PairedComparison }) {
  const d = c.difference;
  return (
    <div>
      <p className="font-medium">
        LLM - baseline, {label}:{" "}
        <span className="tabular">
          {!d
            ? "-"
            : d.degenerate
              ? `${d.estimate >= 0 ? "+" : ""}${pct(d.estimate)} (no interval: n = ${d.n})`
              : `${d.estimate >= 0 ? "+" : ""}${pct(d.estimate)} (95% CI ${pct(d.lower)} to ${pct(d.upper)})`}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        n = {c.n} notes · LLM better on {c.wins}, equal on {c.ties}, worse on {c.losses} · sign test
        p = {c.signTestP.toFixed(3)}
      </p>
    </div>
  );
}

function SummaryRow({
  name,
  s,
  muted = false,
}: {
  name: React.ReactNode;
  s: MethodSummary;
  muted?: boolean;
}) {
  return (
    <tr className={cn(muted && "text-muted-foreground")}>
      <td className="py-2.5 pr-4 font-medium">{name}</td>
      <td className="py-2.5 pr-4">
        {ci(s.meanRecall)}{" "}
        <span className="text-xs text-muted-foreground">n = {s.meanRecall?.n ?? 0}</span>
      </td>
      <td className="py-2.5 pr-4">
        {ci(s.meanF1)} <span className="text-xs text-muted-foreground">n = {s.meanF1?.n ?? 0}</span>
      </td>
      <td className="py-2.5 pr-4">
        {ci(s.pooledRecall)} <span className="text-xs text-muted-foreground">of {s.goldItems}</span>
      </td>
      <td className="py-2.5 pr-4">
        {ci(s.pooledPrecision)}{" "}
        <span className="text-xs text-muted-foreground">of {s.predictions}</span>
      </td>
      <td className="py-2.5">{s.spuriousOnEmptyNotes}</td>
    </tr>
  );
}
