import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTENT_DIR,
  DR_SECTIONS,
  getDecisionRecord,
  getModelCard,
  listDecisionRecords,
  renderMarkdown,
  sectionText,
} from "./docs";
import { evaluateRedaction } from "./redact/evaluate";
import { REDACTION_CORPUS } from "./redact/corpus";
import { baselineScores, notesInSplit, summarise, type MethodSummary } from "./eval/followups";
import type { BootstrapResult, Interval } from "./stats";

const pct = (x: number) => `${Math.round(x * 100)}%`;
/** The docs' style: "84% (71-91%)". */
const fmt = (i: Interval | BootstrapResult | null) =>
  i ? `${pct(i.estimate)} (${Math.round(i.lower * 100)}-${pct(i.upper)})` : "-";

const REPO_DOCS = path.join(process.cwd(), "..", "docs");

describe("decision records and model card", () => {
  const records = listDecisionRecords();

  it("has DR-001 to DR-006 with every section, in order", () => {
    expect(records.map((r) => r.id)).toEqual([
      "DR-001",
      "DR-002",
      "DR-003",
      "DR-004",
      "DR-005",
      "DR-006",
    ]);
    for (const r of records) {
      const headings = [...r.markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      expect(headings, r.slug).toEqual([...DR_SECTIONS]);
      for (const s of DR_SECTIONS)
        expect(sectionText(r.markdown, s).length, `${r.slug} ${s}`).toBeGreaterThan(40);
      expect(r.summary.length).toBeGreaterThan(20);
      expect(r.status).toBeTruthy();
    }
  });

  it("keeps the site copies identical to docs/ (run `pnpm docs:sync`)", () => {
    if (!fs.existsSync(REPO_DOCS)) return; // deploys from web/ only
    const pairs: [string, string][] = [
      [path.join(REPO_DOCS, "model-card.md"), path.join(CONTENT_DIR, "model-card.md")],
      ...fs
        .readdirSync(path.join(REPO_DOCS, "decisions"))
        .filter((f) => f.endsWith(".md"))
        .map((f): [string, string] => [
          path.join(REPO_DOCS, "decisions", f),
          path.join(CONTENT_DIR, "decisions", f),
        ]),
    ];
    for (const [a, b] of pairs)
      expect(fs.readFileSync(b, "utf8"), b).toBe(fs.readFileSync(a, "utf8"));
  });

  it("marks superseded records instead of rewriting them", () => {
    expect(getDecisionRecord("DR-002-demo-inbox")?.status).toMatch(/superseded by DR-005/);
    expect(getDecisionRecord("DR-003-redact-before-llm")?.status).toMatch(/superseded by DR-006/);
  });

  it("quotes exactly the evaluation numbers the code produces (no drift)", () => {
    const card = getModelCard()!;
    const dr006 = getDecisionRecord("DR-006-redact-address-book-names")!.markdown;
    const e = evaluateRedaction();
    const contactOnly = evaluateRedaction(REDACTION_CORPUS, { addressBook: [] });
    for (const c of e.categories) {
      expect(card).toContain(
        `| ${c.caught} of ${c.labelled} | ${fmt(c.recall)} | ${fmt(c.precision)} |`,
      );
    }
    const o = e.overall;
    expect(card).toContain(
      `| **${o.caught} of ${o.labelled}** | **${fmt(o.recall)}** | **${fmt(o.precision)}** |`,
    );
    expect(card).toContain(
      `${e.cleanNotes.clean} of the ${e.cleanNotes.withLabels} notes with personal details came out fully clean: ${fmt(e.cleanNotes.rate)}`,
    );
    const names = (x: typeof e) => x.categories.find((c) => c.category === "name")!;
    const row = (x: typeof e) =>
      `| ${names(x).caught} of ${names(x).labelled}, ${fmt(names(x).recall)} | ${x.overall.caught} of ${x.overall.labelled}, ${fmt(x.overall.recall)} | ${x.overall.truePositives} of ${x.overall.redacted}, ${fmt(x.overall.precision)} | ${x.cleanNotes.clean} of ${x.cleanNotes.withLabels}, ${fmt(x.cleanNotes.rate)} |`;
    expect(dr006).toContain(row(contactOnly));
    expect(dr006).toContain(row(e));
    expect(card).toContain(
      `names were ${names(contactOnly).caught} of ${names(contactOnly).labelled}, ${fmt(names(contactOnly).recall)}, and all details ${contactOnly.overall.caught} of ${contactOnly.overall.labelled}, ${fmt(contactOnly.overall.recall)}`,
    );

    const baselineRow = (label: string, s: MethodSummary) => {
      const r = s.meanRecall!;
      const recall = r.degenerate
        ? `${pct(r.estimate)}, n = ${r.n} (every note scored ${pct(r.estimate)}, so no bootstrap interval)`
        : `${fmt(r)}, n = ${r.n}`;
      const matched = Math.round(s.pooledRecall!.estimate * s.goldItems);
      const kept = Math.round(s.pooledPrecision!.estimate * s.predictions);
      return `| ${label} | ${recall} | ${fmt(s.meanF1)}, n = ${s.meanF1!.n} | ${matched} of ${s.goldItems}, ${fmt(s.pooledRecall)} | ${kept} of ${s.predictions}, ${fmt(s.pooledPrecision)} | ${s.spuriousOnEmptyNotes} |`;
    };
    expect(card).toContain(
      baselineRow(
        "Development (rules written on it)",
        summarise(baselineScores(notesInSplit("development"))),
      ),
    );
    expect(card).toContain(
      baselineRow(
        "Held-out (rules frozen first)",
        summarise(baselineScores(notesInSplit("held-out"))),
      ),
    );
  });

  it("never claims compliance or certification", () => {
    const all = [getModelCard() ?? "", ...records.map((r) => r.markdown)].join("\n");
    expect(all).not.toMatch(/\b(?:is|are|fully|being)\s+compliant\b|\bcertified\b/i);
  });

  it("renders Markdown with site links made relative", () => {
    const html = renderMarkdown(
      "## Hi\n\n[x](https://comp30022-personal-crm.vercel.app/methods#parity)\n\n| a | b |\n| - | - |\n| 1 | 2 |",
    );
    expect(html).toContain("<h2>Hi</h2>");
    expect(html).toContain('href="/methods#parity"');
    expect(html).toContain("<table>");
  });
});
