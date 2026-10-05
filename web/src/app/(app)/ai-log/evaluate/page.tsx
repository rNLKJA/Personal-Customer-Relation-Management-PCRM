import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EvalHarness } from "@/components/ai/eval-harness";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Evaluation harness" };

export default async function EvaluatePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <Link
        href="/ai-log"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> AI log
      </Link>
      <PageHeader
        title="Follow-up evaluation harness"
        description="Does the AI assistant find the follow-ups in a meeting note better than simple rules? The same notes go through a rule-based baseline and the LLM, scored by the same matcher and compared note by note."
      />
      <div className="mb-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <Fact title="Inputs">
          32 synthetic notes with hand-labelled follow-ups, in two splits. The baseline rules were
          written while looking at the development split, so quote the held-out split.
        </Fact>
        <Fact title="Metric">
          Recall of labelled follow-ups per note (keyword-group match), precision of suggestions,
          and suggestions made on notes with nothing to do. 95% intervals: percentile bootstrap
          (seeded) and Wilson.
        </Fact>
        <Fact title="Caveats">
          Keyword matching under-credits paraphrases; 16 notes give wide intervals; the notes and
          labels were written by one person. See the{" "}
          <Link href="/methods#evaluation" className="text-primary hover:underline">
            evaluation design
          </Link>
          .
        </Fact>
      </div>
      <EvalHarness />
    </div>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-soft)">
      <p className="text-xs font-semibold tracking-wide text-foreground uppercase">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed">{children}</p>
    </div>
  );
}
