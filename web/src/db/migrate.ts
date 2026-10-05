import { createDb, runMigrations } from "./client-core";
import { scriptTarget } from "./scripts-env";

/** `pnpm db:migrate` - apply drizzle/ migrations to DATABASE_URL (default data/app.db). */
async function main() {
  const target = scriptTarget();
  const { db, client } = createDb(target.url, target.authToken);
  await runMigrations(db);
  client.close();
  console.log(`[db:migrate] ${target.label} is up to date`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
