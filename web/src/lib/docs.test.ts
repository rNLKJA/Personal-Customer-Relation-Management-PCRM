import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTENT_DIR,
  DR_SECTIONS,
  getModelCard,
  listDecisionRecords,
  renderMarkdown,
  sectionText,
} from "./docs";

const REPO_DOCS = path.join(process.cwd(), "..", "docs");

describe("decision records and model card", () => {
  const records = listDecisionRecords();

  it("has DR-001 to DR-004 with every section, in order", () => {
    expect(records.map((r) => r.id)).toEqual(["DR-001", "DR-002", "DR-003", "DR-004"]);
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
