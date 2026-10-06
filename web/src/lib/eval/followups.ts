import {
  mean,
  pairedBootstrapCI,
  bootstrapCI,
  signTestPValue,
  wilsonInterval,
  type BootstrapResult,
  type Interval,
} from "../stats";
import {
  FOLLOW_UP_CORPUS,
  type FollowUpNote,
  type GoldFollowUp,
  type Split,
} from "./followup-corpus";

/**
 * Follow-up extraction: a transparent rule-based baseline, a keyword-group
 * scorer and paired summary statistics. The LLM side of the comparison is run
 * in the browser with the visitor's own key (see /ai-log/evaluate); the
 * baseline needs no key and is shown on /methods.
 */

export interface FollowUp {
  action: string;
  due: string | null;
}

// ---------------------------------------------------------------- baseline --

const CUES =
  /\b(will|i'll|need to|should|must|promised to|remember to|next step|action|todo|follow up|follow-up|send|email|forward|book|confirm|review|check in|ask|prep|prepare|fix|renew|try|test|write up|proofread|pay|recommend|connect|set up|add|share|report back)\b/i;
const LEADS =
  /^(?:(?:and|also|then|so)\s+)*(?:action:|next step:|todo:|i need to|i should|i must|i'll|i will|will|remember to|(?:i\s+)?promised to)\s*/i;
const DUE =
  /\b(?:by|before|after|on|in|this|next)\s+(?:the\s+)?(?:\d{1,2}(?:st|nd|rd|th)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|two weeks|a (?:week|month)|tomorrow|their first month|[a-z]+day's demo)\b|\btonight\b|\bbeforehand\b/i;
/** The other person's commitments are not the author's follow-ups. */
const THIRD_PARTY = /^(?:she|he|they)(?:'ll| will)\b|^owes me\b/i;

function clauses(note: string): string[] {
  return note
    .split(/(?<=[.!?])\s+|;\s+|\s+-\s+|,\s+and\s+|\s+and\s+(?=[a-z]+\s)/)
    .map((s) => s.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean);
}

/**
 * Rule-based baseline: keep clauses with a commitment cue ("promised to",
 * "send", "next step: ..."), strip the lead-in, pull out a due phrase.
 */
export function extractFollowUpsBaseline(note: string, max = 5): FollowUp[] {
  const out: FollowUp[] = [];
  for (const clause of clauses(note)) {
    if (!CUES.test(clause) || THIRD_PARTY.test(clause)) continue;
    if (/\bno next steps?\b|\bnothing agreed\b/i.test(clause)) continue;
    const action = clause.replace(LEADS, "").replace(/^\w/, (c) => c.toUpperCase());
    const due = clause.match(DUE)?.[0] ?? null;
    out.push({ action, due });
    if (out.length >= max) break;
  }
  return out;
}

// ------------------------------------------------------------------ scorer --

/**
 * Lower-case word tokens. "e-mail" is folded to "email" first: the app's house
 * style (and Australian English) hyphenates it, and splitting it into "e" and
 * "mail" would fail the "email" keyword (it did, for gold item 101).
 */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\be[\u2010\u2011-]mail/g, "email")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function matchesGold(text: string, gold: GoldFollowUp): boolean {
  const words = tokens(text);
  return gold.groups.every((group) => group.some((k) => words.some((w) => w.startsWith(k))));
}

export interface NoteScore {
  noteId: number;
  gold: number;
  predicted: number;
  matchedGold: number;
  matchedPredictions: number;
  /** null when the note has no gold follow-ups. */
  recall: number | null;
  precision: number | null;
  /**
   * Per-note F1, defined for every note: on a note with nothing to do it is 1
   * for no suggestions and 0 for any; otherwise 0 when either side is empty.
   * Unlike recall it penalises over-suggestion.
   */
  f1: number;
  missed: string[];
}

export function noteF1(gold: number, predicted: number, matched: number): number {
  if (gold === 0) return predicted === 0 ? 1 : 0;
  if (predicted === 0 || matched === 0) return 0;
  const p = matched / predicted;
  const r = matched / gold;
  return (2 * p * r) / (p + r);
}

/** Greedy one-to-one matching of predictions to gold items. */
export function scoreNote(note: FollowUpNote, predictions: readonly FollowUp[]): NoteScore {
  const used = new Set<number>();
  const missed: string[] = [];
  let matched = 0;
  for (const g of note.gold) {
    const i = predictions.findIndex((p, idx) => !used.has(idx) && matchesGold(p.action, g));
    if (i >= 0) {
      used.add(i);
      matched++;
    } else missed.push(g.label);
  }
  return {
    noteId: note.id,
    gold: note.gold.length,
    predicted: predictions.length,
    matchedGold: matched,
    matchedPredictions: used.size,
    recall: note.gold.length ? matched / note.gold.length : null,
    precision: predictions.length ? used.size / predictions.length : null,
    f1: noteF1(note.gold.length, predictions.length, matched),
    missed,
  };
}

export interface MethodSummary {
  notes: number;
  /** Mean of per-note recall over notes that have gold items, with a bootstrap CI. */
  meanRecall: BootstrapResult | null;
  /** Mean per-note F1 over all notes (including no-action notes), with a bootstrap CI. */
  meanF1: BootstrapResult | null;
  /** Pooled over all gold items (Wilson; ignores clustering within notes). */
  pooledRecall: Interval | null;
  pooledPrecision: Interval | null;
  /** Suggestions made on notes whose gold list is empty. */
  spuriousOnEmptyNotes: number;
  goldItems: number;
  predictions: number;
}

export const EVAL_SEED = 4399;
export const EVAL_RESAMPLES = 4000;

export function summarise(scores: readonly NoteScore[]): MethodSummary {
  const withGold = scores.filter((s) => s.recall !== null);
  const goldItems = scores.reduce((n, s) => n + s.gold, 0);
  const matched = scores.reduce((n, s) => n + s.matchedGold, 0);
  const predictions = scores.reduce((n, s) => n + s.predicted, 0);
  const matchedPred = scores.reduce((n, s) => n + s.matchedPredictions, 0);
  return {
    notes: scores.length,
    meanRecall: bootstrapCI(
      withGold.map((s) => s.recall!),
      mean,
      { seed: EVAL_SEED, resamples: EVAL_RESAMPLES },
    ),
    meanF1: bootstrapCI(
      scores.map((s) => s.f1),
      mean,
      { seed: EVAL_SEED, resamples: EVAL_RESAMPLES },
    ),
    pooledRecall: wilsonInterval(matched, goldItems),
    pooledPrecision: wilsonInterval(matchedPred, predictions),
    spuriousOnEmptyNotes: scores.filter((s) => s.gold === 0).reduce((n, s) => n + s.predicted, 0),
    goldItems,
    predictions,
  };
}

export type PairedMetric = "recall" | "f1";

export interface PairedComparison {
  metric: PairedMetric;
  /**
   * Notes scored by both methods: for recall, notes with gold items; for F1,
   * every note (no-action notes included).
   */
  n: number;
  /** Mean per-note difference (candidate - baseline) with a paired bootstrap CI. */
  difference: BootstrapResult | null;
  wins: number;
  ties: number;
  losses: number;
  /** Exact two-sided sign test on wins vs losses (ties dropped). */
  signTestP: number;
}

function metricOf(s: NoteScore, metric: PairedMetric): number | null {
  return metric === "recall" ? s.recall : s.f1;
}

export function compare(
  candidate: readonly NoteScore[],
  baseline: readonly NoteScore[],
  metric: PairedMetric = "recall",
): PairedComparison {
  const byId = new Map(baseline.map((s) => [s.noteId, s]));
  const pairs = candidate
    .map((c) => {
      const b = byId.get(c.noteId);
      const x = metricOf(c, metric);
      const y = b ? metricOf(b, metric) : null;
      return x === null || y === null ? null : ([x, y] as const);
    })
    .filter((p): p is readonly [number, number] => p !== null);
  const wins = pairs.filter(([a, b]) => a > b).length;
  const losses = pairs.filter(([a, b]) => a < b).length;
  return {
    metric,
    n: pairs.length,
    difference: pairedBootstrapCI(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
      { seed: EVAL_SEED, resamples: EVAL_RESAMPLES },
    ),
    wins,
    ties: pairs.length - wins - losses,
    losses,
    signTestP: signTestPValue(wins, wins + losses),
  };
}

export function notesInSplit(split: Split): FollowUpNote[] {
  return FOLLOW_UP_CORPUS.filter((n) => n.split === split);
}

/** Score the baseline (deterministic, no key needed). */
export function baselineScores(corpus: readonly FollowUpNote[] = FOLLOW_UP_CORPUS): NoteScore[] {
  return corpus.map((n) => scoreNote(n, extractFollowUpsBaseline(n.note)));
}
