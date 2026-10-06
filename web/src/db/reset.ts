import fs from "node:fs";
import path from "node:path";
import { createDb, runMigrations } from "./client-core";
import { seedDatabase, startOfUtcDay } from "./populate";

/**
 * `pnpm db:reset`     - rebuild data/app.db from migrations + seed.
 * `pnpm db:snapshot`  - same, but write the committed snapshot data/seed.db
 *                       (bundled with the app and copied to /tmp on Vercel).
 */
async function main() {
  const snapshot = process.argv.includes("--snapshot");
  const file = path.join(process.cwd(), "data", snapshot ? "seed.db" : "app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const suffix of ["", "-wal", "-shm", "-journal"]) fs.rmSync(file + suffix, { force: true });

  const { db, client } = createDb(`file:${file}`);
  await runMigrations(db);
  const anchor = process.env.SEED_ANCHOR
    ? new Date(`${process.env.SEED_ANCHOR}T00:00:00Z`)
    : startOfUtcDay();
  await seedDatabase(db, anchor);
  await client.execute("VACUUM");
  client.close();
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(
    `[db:${snapshot ? "snapshot" : "reset"}] wrote ${path.relative(process.cwd(), file)} (${kb} KiB, anchor ${anchor.toISOString().slice(0, 10)})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
