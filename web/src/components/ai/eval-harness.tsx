"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FlaskConical, Loader2, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiSettingsDialog } from "./ai-settings-dialog";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { runMeetingAssist } from "@/lib/ai/client";
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
} from "@/lib/eval/followups";
import { redact } from "@/lib/redact/redact";
import { toCsv } from "@/lib/csv";
import { logAiCallAction } from "@/server/actions/ai";
import { cn } from "@/lib/utils";

/**
 * Evaluation harness: the same notes through the rule-based baseline and the
 * LLM (the meeting-note assistant's exact prompt), scored by the same keyword
 * matcher, compared note by note. Runs in the browser with the visitor's key;
 * every LLM call is written to the AI log (decision "not applicable").
 */

interface LlmResult {
  noteId: number;
  ok: boolean;
  predictions: FollowUp[];
  error: string | null;
  latencyMs: number;
  tokens: number | null;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const ci = (s: { estimate: number; lower: number; upper: number } | null) =>
  s ? `${pct(s.estimate)} (${pct(s.lower)}-${pct(s.upper)})` : "-";

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
  const llmOk = llm.filter((r) => r.ok);
  const llmScores: NoteScore[] = llmOk.map((r) =>
    scoreNote(
      notes.find((n) => n.id === r.noteId)!,
      r.predictions,
    ),
  );
  const scoredIds = new Set(llmScores.map((s) => s.noteId));
  const baselineOnSame = baseline.filter((s) => scoredIds.has(s.noteId));
  const baseSummary = summarise(baseline);
  const llmSummary = llmScores.length ? summarise(llmScores) : null;
  const paired = llmScores.length ? compare(llmScores, baselineOnSame) : null;
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
      if (!res.ok && (res.error.kind === "aborted" || res.error.kind === "no_key")) break;
      await logAiCallAction(res.audit);
      out.push({
        noteId: note.id,
        ok: res.ok,
        predictions: res.ok ? res.output.follow_ups : [],
        error: res.ok ? null : res.error.userMessage,
        latencyMs: res.audit.latencyMs,
        tokens:
          res.audit.inputTokens != null && res.audit.outputTokens != null
            ? res.audit.inputTokens + res.audit.outputTokens
            : null,
      });
      setProgress(i + 1);
      setResults((r) => ({
        ...r,
        [split]: { model: `${settings.provider}:${model}`, rows: [...out] },
      }));
      if (!res.ok && (res.error.kind === "invalid_key" || res.error.kind === "billing")) {
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
        llmModel: l ? runModel : null,
        llmOk: l?.ok ?? null,
        llmSuggestions: ls?.predicted ?? null,
        llmMatched: ls?.matchedGold ?? null,
        llmRecall: ls?.recall ?? null,
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
            role="radiogroup"
            aria-label="Corpus split"
            className="inline-flex rounded-lg border p-0.5"
          >
            {(["held-out", "development"] as Split[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={split === s}
                disabled={running}
                onClick={() => setSplit(s)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
                      baseline: baseSummary,
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

        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Summary table">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Method
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Mean recall per note (95% CI)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Pooled recall (Wilson)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Precision (Wilson)
                </th>
                <th scope="col" className="py-2 font-medium">
                  Suggestions on no-action notes
                </th>
              </tr>
            </thead>
            <tbody className="tabular divide-y">
              <SummaryRow name="Rule-based baseline" s={baseSummary} />
              {llmSummary ? (
                <SummaryRow
                  name={`LLM: ${runModel.split(":").slice(1).join(":")}`}
                  s={llmSummary}
                />
              ) : (
                <tr>
                  <td className="py-2.5 pr-4 font-medium">LLM</td>
                  <td colSpan={4} className="py-2.5 text-muted-foreground">
                    Not run yet in this browser.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paired && paired.difference && (
          <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
            <p className="font-medium">
              Paired difference (LLM - baseline), mean per-note recall:{" "}
              <span className="tabular">
                {paired.difference.estimate >= 0 ? "+" : ""}
                {pct(paired.difference.estimate)} (95% CI {pct(paired.difference.lower)} to{" "}
                {pct(paired.difference.upper)})
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              n = {paired.n} notes with gold follow-ups scored by both · LLM better on {paired.wins}
              , equal on {paired.ties}, worse on {paired.losses} · exact sign test p ={" "}
              {paired.signTestP.toFixed(3)} · paired bootstrap,{" "}
              {EVAL_RESAMPLES.toLocaleString("en-AU")} resamples, seed {EVAL_SEED}
              {llm.length - llmOk.length > 0
                ? ` · ${llm.length - llmOk.length} failed call(s) excluded`
                : ""}
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
                      <span className="font-medium">LLM</span>{" "}
                      {l.ok
                        ? `${ls?.matchedGold ?? 0}/${n.gold.length} · ${l.predictions.map((f) => f.action).join("; ") || "no suggestions"}`
                        : `failed: ${l.error}`}
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

function SummaryRow({ name, s }: { name: string; s: MethodSummary }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 font-medium">{name}</td>
      <td className="py-2.5 pr-4">
        {ci(s.meanRecall)}{" "}
        <span className="text-xs text-muted-foreground">n = {s.meanRecall?.n ?? 0} notes</span>
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
