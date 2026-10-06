import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PARITY, paritySummary } from "./parity";

/**
 * The parity table on /methods must cover exactly the endpoints in the
 * original Express routers, and every replacement it names must exist.
 */

const WEB = process.cwd();
const ROUTES = path.join(WEB, "..", "coursework", "backend", "routes");
const MOUNTS: Record<string, string> = {
  "contactRouter.js": "/contact",
  "profileRouter.js": "/profile",
  "recordRouter.js": "/record",
  "userRouter.js": "/user",
};

function originalEndpoints(): string[] {
  const out: string[] = [];
  for (const [file, prefix] of Object.entries(MOUNTS)) {
    // Drop commented-out routes (userRouter.js has one for debugging).
    const src = fs
      .readFileSync(path.join(ROUTES, file), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    for (const m of src.matchAll(/\.(get|post)\(\s*["'](\/[^"']+)["']/g)) {
      out.push(`${m[1].toUpperCase()} ${prefix}${m[2]}`);
    }
  }
  return out.sort();
}

describe("functional parity table", () => {
  it("lists every original REST endpoint exactly once (40)", () => {
    const original = originalEndpoints();
    expect(original).toHaveLength(40);
    expect(PARITY.map((r) => `${r.method} ${r.path}`).sort()).toEqual(original);
  });

  it("names replacements that are really exported", () => {
    for (const row of PARITY) {
      if (row.status !== "dropped") expect(row.targets.length, row.path).toBeGreaterThan(0);
      for (const target of row.targets) {
        const src = fs.readFileSync(path.join(WEB, target.file), "utf8");
        expect(src, `${target.symbol} in ${target.file}`).toMatch(
          new RegExp(`export (async )?function ${target.symbol}\\b`),
        );
      }
    }
  });

  it("explains every change and drop", () => {
    for (const row of PARITY) expect(row.note.length, row.path).toBeGreaterThan(20);
    const s = paritySummary();
    expect(s.implemented + s.changed + s.dropped).toBe(40);
  });
});
