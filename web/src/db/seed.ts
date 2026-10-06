import { sql } from "drizzle-orm";
import { createDb } from "./client-core";
import { seedDatabase, startOfUtcDay } from "./populate";
import { scriptTarget } from "./scripts-env";
import { users } from "./schema";

/**
 * `pnpm db:seed` - insert the deterministic demo data (demo + admin accounts,
 * directory users, 25 contacts and 40 meetings) into an empty, migrated
 * database. Set SEED_ANCHOR=YYYY-MM-DD to pin the dates.
 */
async function main() {
  const target = scriptTarget();
  const { db, client } = createDb(target.url, target.authToken);
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(users);
  if (Number(n) > 0 && !process.argv.includes("--force")) {
    console.log(
      `[db:seed] ${target.label} already has ${n} users - skipping (use --force to add anyway)`,
    );
    client.close();
    return;
  }
  const anchor = process.env.SEED_ANCHOR
    ? new Date(`${process.env.SEED_ANCHOR}T00:00:00Z`)
    : startOfUtcDay();
  await seedDatabase(db, anchor);
  client.close();
  console.log(`[db:seed] seeded ${target.label} (anchor ${anchor.toISOString().slice(0, 10)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
