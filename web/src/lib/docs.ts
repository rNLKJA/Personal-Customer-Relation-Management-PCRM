import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { SITE } from "./site";

/**
 * Decision records and the model card, rendered from the Markdown copies in
 * web/content/docs (synced from the repository's docs/ by scripts/sync-docs.mjs).
 * The files are our own, committed content - not user input.
 */

export const CONTENT_DIR = path.join(process.cwd(), "content", "docs");
const DECISIONS_DIR = path.join(CONTENT_DIR, "decisions");

export const DR_SECTIONS = [
  "Context",
  "Decision",
  "Options considered",
  "Why",
  "What happened",
  "What I'd change",
] as const;

export interface DecisionRecord {
  slug: string;
  id: string;
  title: string;
  status: string | null;
  date: string | null;
  /** First sentence of the Decision section (the decision, stated first). */
  summary: string;
  markdown: string;
}

const marked = new Marked({ gfm: true });

/** Markdown -> HTML; absolute links to the live site become same-origin paths. */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  return html.replaceAll(`href="${SITE.url}/`, 'href="/');
}

function field(md: string, name: string): string | null {
  const m = md.match(new RegExp(`^- \\*\\*${name}:\\*\\* (.+)$`, "m"));
  return m ? m[1].trim() : null;
}

export function sectionText(md: string, heading: string): string {
  const m = md.match(
    new RegExp(
      `^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n+([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,
      "m",
    ),
  );
  return m ? m[1].trim() : "";
}

function parse(slug: string, markdown: string): DecisionRecord {
  const titleLine = markdown.match(/^# (.+)$/m)?.[1] ?? slug;
  const [id, ...rest] = titleLine.split(":");
  const decision = sectionText(markdown, "Decision");
  const summary = decision.split(/(?<=\.)\s/)[0]?.replace(/\*\*|`/g, "") ?? "";
  return {
    slug,
    id: id.trim(),
    title: rest.join(":").trim() || titleLine,
    status: field(markdown, "Status"),
    date: field(markdown, "Date"),
    summary,
    markdown,
  };
}

export function listDecisionRecords(): DecisionRecord[] {
  if (!fs.existsSync(DECISIONS_DIR)) return [];
  return fs
    .readdirSync(DECISIONS_DIR)
    .filter((f) => /^DR-\d{3}-[a-z0-9-]+\.md$/.test(f))
    .sort()
    .map((f) =>
      parse(f.replace(/\.md$/, ""), fs.readFileSync(path.join(DECISIONS_DIR, f), "utf8")),
    );
}

export function getDecisionRecord(slug: string): DecisionRecord | null {
  return listDecisionRecords().find((d) => d.slug === slug) ?? null;
}

export function getModelCard(): string | null {
  const file = path.join(CONTENT_DIR, "model-card.md");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}
