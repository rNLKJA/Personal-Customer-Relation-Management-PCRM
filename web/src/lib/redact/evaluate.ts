import { wilsonInterval, type Interval } from "../stats";
import { REDACTION_CORPUS, type LabelledNote } from "./corpus";
import { redact, type RedactionCategory } from "./redact";

/**
 * Span-level evaluation of the redactor against the labelled corpus.
 *
 * - A labelled (gold) span is **caught** when every one of its characters is
 *   inside some redacted span (any category - what matters for privacy is that
 *   the text never leaves the browser), **partial** when only some are, and
 *   **missed** otherwise. Recall = caught / labelled.
 * - A redacted span is a **true positive** when it overlaps a labelled span,
 *   otherwise a **false positive**. Precision = true positives / redacted.
 * - Intervals are 95% Wilson score intervals. They treat spans as independent,
 *   although spans in the same note are not, so they are somewhat too narrow.
 */

export const CATEGORIES: RedactionCategory[] = ["email", "phone", "address", "name"];

export interface SpanOutcome {
  noteId: number;
  category: RedactionCategory;
  text: string;
  outcome: "caught" | "partial" | "missed";
}

export interface FalsePositive {
  noteId: number;
  category: RedactionCategory;
  text: string;
}

export interface CategoryMetrics {
  category: RedactionCategory;
  labelled: number;
  caught: number;
  partial: number;
  missed: number;
  recall: Interval | null;
  redacted: number;
  truePositives: number;
  precision: Interval | null;
}

export interface RedactionEvaluation {
  notes: number;
  categories: CategoryMetrics[];
  overall: Omit<CategoryMetrics, "category">;
  /** Notes in which every labelled span was fully redacted. */
  cleanNotes: { clean: number; withLabels: number; rate: Interval | null };
  outcomes: SpanOutcome[];
  falsePositives: FalsePositive[];
}

function locate(note: LabelledNote, text: string): [number, number] {
  const start = note.text.indexOf(text);
  if (start < 0) throw new Error(`label "${text}" not found in note ${note.id}`);
  if (note.text.indexOf(text, start + 1) >= 0) {
    throw new Error(`label "${text}" is ambiguous in note ${note.id}`);
  }
  return [start, start + text.length];
}

function summarise(
  category: RedactionCategory | null,
  outcomes: SpanOutcome[],
  predictions: { category: RedactionCategory; tp: boolean }[],
) {
  const gold = category ? outcomes.filter((o) => o.category === category) : outcomes;
  const pred = category ? predictions.filter((p) => p.category === category) : predictions;
  const caught = gold.filter((o) => o.outcome === "caught").length;
  const tp = pred.filter((p) => p.tp).length;
  return {
    labelled: gold.length,
    caught,
    partial: gold.filter((o) => o.outcome === "partial").length,
    missed: gold.filter((o) => o.outcome === "missed").length,
    recall: wilsonInterval(caught, gold.length),
    redacted: pred.length,
    truePositives: tp,
    precision: wilsonInterval(tp, pred.length),
  };
}

export function evaluateRedaction(
  corpus: readonly LabelledNote[] = REDACTION_CORPUS,
): RedactionEvaluation {
  const outcomes: SpanOutcome[] = [];
  const falsePositives: FalsePositive[] = [];
  const predictions: { category: RedactionCategory; tp: boolean }[] = [];
  let clean = 0;
  let withLabels = 0;

  for (const note of corpus) {
    const { spans } = redact(note.text, { knownNames: note.known });
    const covered = new Uint8Array(note.text.length);
    for (const s of spans) covered.fill(1, s.start, s.end);
    const gold = note.labels.map((l) => ({ ...l, range: locate(note, l.text) }));

    let allCaught = true;
    for (const g of gold) {
      const [a, b] = g.range;
      let n = 0;
      for (let i = a; i < b; i++) n += covered[i];
      const outcome = n === b - a ? "caught" : n > 0 ? "partial" : "missed";
      if (outcome !== "caught") allCaught = false;
      outcomes.push({ noteId: note.id, category: g.category, text: g.text, outcome });
    }
    if (gold.length > 0) {
      withLabels++;
      if (allCaught) clean++;
    }
    for (const s of spans) {
      const tp = gold.some((g) => s.start < g.range[1] && g.range[0] < s.end);
      predictions.push({ category: s.category, tp });
      if (!tp) falsePositives.push({ noteId: note.id, category: s.category, text: s.original });
    }
  }

  return {
    notes: corpus.length,
    categories: CATEGORIES.map((c) => ({ category: c, ...summarise(c, outcomes, predictions) })),
    overall: summarise(null, outcomes, predictions),
    cleanNotes: { clean, withLabels, rate: wilsonInterval(clean, withLabels) },
    outcomes,
    falsePositives,
  };
}
