import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getDecisionRecord, listDecisionRecords, renderMarkdown } from "@/lib/docs";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return listDecisionRecords().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/methods/decisions/[slug]">): Promise<Metadata> {
  const d = getDecisionRecord((await params).slug);
  return d
    ? { title: `${d.id}: ${d.title}`, description: d.summary }
    : { title: "Decision record" };
}

export default async function DecisionRecordPage({
  params,
}: PageProps<"/methods/decisions/[slug]">) {
  const { slug } = await params;
  const all = listDecisionRecords();
  const index = all.findIndex((d) => d.slug === slug);
  if (index < 0) notFound();
  const d = all[index];
  const prev = all[index - 1];
  const next = all[index + 1];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 sm:px-8">
      <Link
        href="/methods#decisions"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Methods and decisions
      </Link>
      <article
        className="doc-prose animate-fade-up"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(d.markdown) }}
      />
      <p className="mt-10 text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={`${SITE.repo}/blob/main/docs/decisions/${d.slug}.md`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          docs/decisions/{d.slug}.md
        </a>
        . Decision records are never edited after they are accepted; a later record supersedes them.
      </p>
      <nav
        aria-label="Other decision records"
        className="mt-6 grid gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={`/methods/decisions/${prev.slug}`}
            className="group rounded-xl border p-3 hover:bg-muted"
          >
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowLeft className="size-3" aria-hidden="true" /> {prev.id}
            </span>
            <span className="text-sm font-medium group-hover:text-primary">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/methods/decisions/${next.slug}`}
            className="group rounded-xl border p-3 text-right hover:bg-muted"
          >
            <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              {next.id} <ArrowRight className="size-3" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium group-hover:text-primary">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
