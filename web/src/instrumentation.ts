/**
 * Runs once per server instance before it handles requests: bring the
 * database schema up to date (see `ensureSchema` in src/db/client.ts) and
 * apply the activity-log retention rule.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSchema, purgeAtStartup } = await import("./db/client");
  await ensureSchema();
  await purgeAtStartup();
}
