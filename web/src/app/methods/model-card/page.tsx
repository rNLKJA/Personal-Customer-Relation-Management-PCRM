import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getModelCard, renderMarkdown } from "@/lib/docs";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Model card",
  description:
    "Intended use, data, evaluation with confidence intervals, failure modes and ethical considerations of the 4399 CRM meeting-note assistant and its redactor.",
};

export default function ModelCardPage() {
  const markdown = getModelCard();
  if (!markdown) notFound();
  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 sm:px-8">
      <Link
        href="/methods#ai-use"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Methods and decisions
      </Link>
      <article
        className="doc-prose animate-fade-up"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
      />
      <p className="mt-10 text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={`${SITE.repo}/blob/main/docs/model-card.md`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          docs/model-card.md
        </a>
        . Live evaluation numbers:{" "}
        <Link href="/methods#evaluation" className="underline underline-offset-2">
          /methods
        </Link>
        .
      </p>
    </div>
  );
}
