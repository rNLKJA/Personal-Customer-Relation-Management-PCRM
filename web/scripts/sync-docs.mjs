// Copies the decision records and the model card from the repository's docs/
// into web/content/docs so the site can render them. Vercel deploys from web/
// only, so the copies are committed; src/lib/docs.test.ts fails if they drift.
// Runs before `next build`; a no-op when ../docs is not present.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const web = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(web, "..", "docs");
const target = join(web, "content", "docs");

if (!existsSync(source)) {
  console.log("[sync-docs] ../docs not found - using the committed copies");
  process.exit(0);
}

mkdirSync(join(target, "decisions"), { recursive: true });
for (const f of readdirSync(join(target, "decisions"))) {
  if (!existsSync(join(source, "decisions", f))) rmSync(join(target, "decisions", f));
}
for (const f of readdirSync(join(source, "decisions")).filter((f) => f.endsWith(".md"))) {
  copyFileSync(join(source, "decisions", f), join(target, "decisions", f));
}
copyFileSync(join(source, "model-card.md"), join(target, "model-card.md"));
console.log("[sync-docs] content/docs is up to date");
